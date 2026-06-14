# pylint: disable=no-member
from typing import Any, Optional, cast

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.text import slugify
from rest_framework import exceptions, serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Block, Comment, Follow, Notification, Post, Profile, Report, User

# --- AUXILIARES ---


def get_default_avatar_url(request: Optional[Any]) -> str:
    """
    Retorna a URL do avatar padrão. Se houver um 'request' no contexto,
    gera a URL absoluta com o domínio, caso contrário retorna o caminho relativo.
    """
    path = "/static/images/default-avatar.png"
    return request.build_absolute_uri(path) if request else path


# --- SERIALIZERS ---


class UserProfileSerializer(serializers.ModelSerializer[User]):
    """
    Serializer para visualizar e atualizar o perfil do próprio usuário autenticado.
    """

    # Mapeia o ID do perfil associado ao usuário
    id = serializers.CharField(source="profile.id", read_only=True)
    # Campo dinâmico para renderizar a URL da foto de perfil
    profile_picture = serializers.SerializerMethodField()
    # Campo apenas para escrita focado no upload de novas imagens
    upload_picture = serializers.ImageField(write_only=True, required=False)
    # Define o username como apenas leitura para evitar alterações indesejadas
    username = serializers.CharField(read_only=True)
    # Mapeia campos diretamente do model Profile relacionado
    display_name = serializers.CharField(source="profile.display_name", required=False)
    bio = serializers.CharField(source="profile.bio", required=False, allow_blank=True)
    is_private = serializers.BooleanField(source="profile.is_private", required=False)
    # ✅ 1. Declarando o campo de validação de senha
    has_password = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "full_name",
            "display_name",
            "bio",
            "profile_picture",
            "upload_picture",
            "social_id",
            "provider",
            "is_private",
            "has_password",  # ✅ 2. Adicionado na lista de campos retornados
        ]
        read_only_fields = ["id", "username"]

    # ✅ 3. Função para checar dinamicamente no banco se o usuário tem senha activa
    def get_has_password(self, obj: User) -> bool:
        return obj.has_usable_password()

    def get_profile_picture(self, obj: User) -> str:
        """
        Retorna a URL da foto de perfil se estiver aprovada pela moderação,
        caso contrário, retorna o avatar padrão do sistema.
        """
        request = self.context.get("request")
        profile = obj.profile
        if profile and profile.image_status == "APPROVED" and profile.profile_picture:
            return (
                request.build_absolute_uri(profile.profile_picture.url)
                if request
                else profile.profile_picture.url
            )
        return get_default_avatar_url(request)

    def validate_upload_picture(self, image: Any) -> Any:
        """
        Valida se o arquivo de imagem enviado não ultrapassa o limite de 2MB.
        """
        if image.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("A imagem deve ter no máximo 2MB.")
        return image

    def update(self, instance: User, validated_data: dict[str, Any]) -> User:
        """
        Sobrescreve o método de atualização para salvar dados tanto no User quanto
        no Profile correspondente, definindo a imagem como PENDING se houver upload.
        """
        profile_data = validated_data.pop("profile", {})
        instance.full_name = validated_data.get("full_name", instance.full_name)
        instance.email = validated_data.get("email", instance.email)
        instance.save()

        profile = instance.profile
        if profile:
            if "is_private" in profile_data:
                profile.is_private = profile_data["is_private"]
            for attr, value in profile_data.items():
                setattr(profile, attr, value)

            upload_picture = validated_data.pop("upload_picture", None)
            if upload_picture:
                profile.profile_picture = upload_picture
                profile.image_status = "PENDING"
            profile.save()

        return instance


class RegisterSerializer(serializers.ModelSerializer[User]):
    """
    Serializer focado no fluxo de registro/cadastro padrão por e-mail e senha.
    """

    password = serializers.CharField(write_only=True, required=True)
    full_name = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ("username", "email", "full_name", "password")

    def validate_email(self, value: str) -> str:
        """
        Garante que não existam dois usuários cadastrados com o mesmo e-mail.
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este e-mail já está em uso.")
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        # Intercepta os dados e força o Django a validar a senha contida no payload
        password = attrs.get("password")
        if not password:
            raise serializers.ValidationError({"password": "Password is required."})

        # Garante que os valores passados sejam strings vazias caso venham nulos
        username_val = attrs.get("username") or ""
        email_val = attrs.get("email") or ""

        # Opcional: passa o objeto do usuário simulado para evitar senhas parecidas com username/email
        user_instance = User(username=username_val, email=email_val)

        try:
            validate_password(password, user=user_instance)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})

        return attrs

    def create(self, validated_data: dict[str, Any]) -> User:
        """
        Utiliza o método do UserManager para criar o usuário criptografando a senha.
        """
        return User.objects.create_user(**validated_data)


class ChangePasswordSerializer(serializers.Serializer[Any]):
    """
    Serializer responsável pelo payload de alteração de senha de usuários logados.
    """

    current_password = serializers.CharField(required=False, allow_blank=True)
    new_password = serializers.CharField(required=True)

    def validate_new_password(self, value: str) -> str:
        """
        Valida se a nova senha atende a todos os requisitos de segurança do Django.
        """
        try:
            # Puxa o usuário contextualizado na View através do self.context prevenindo erros None
            request = self.context.get("request")
            user = request.user if request and request.user.is_authenticated else None

            # Valida a nova senha contra todas as regras do settings.py
            validate_password(value, user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value


class GoogleRegisterSerializer(serializers.ModelSerializer[User]):
    """
    Serializer para criação de contas integradas via provedor de autenticação Google.
    """

    # O social_id e full_name vêm do payload do Google, e o username é enviado pelo usuário
    social_id = serializers.CharField(required=True)
    full_name = serializers.CharField(required=True)
    username = serializers.CharField(required=True, min_length=3, max_length=50)

    class Meta:
        model = User
        fields = ("username", "email", "full_name", "social_id")

    def validate_username(self, value: str) -> str:
        # Garante a formatação limpa padrão do app usando o slugify
        clean_username = slugify(value).replace("-", "_")

        if User.objects.filter(username=clean_username).exists():
            raise serializers.ValidationError(
                "Este nome de usuário já está sendo utilizado."
            )
        return clean_username

    def validate_email(self, value: str) -> str:
        """
        Impede a criação de conta se o e-mail do Google já existir no sistema.
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "Este e-mail já está cadastrado no sistema."
            )
        return value

    def create(self, validated_data: dict[str, Any]) -> User:
        # Define os dados estruturais forçando o provider como 'google'
        validated_data["provider"] = "google"

        # Como o UserManager exige o email primeiro de acordo com nosso models.py:
        email = validated_data.pop("email")
        username = validated_data.pop("username")

        # Cria o usuário via UserManager (que já lida com set_unusable_password por não passar senha)
        user = User.objects.create_user(
            email=email, username=username, **validated_data
        )
        return user


class GoogleAuthSerializer(serializers.Serializer[Any]):
    """
    Serializer simples para receber o access token do Google enviado pelo frontend.
    """

    access_token = serializers.CharField()


class FeedAuthorSerializer(serializers.ModelSerializer[User]):
    """
    Serializer reduzido de Usuário focado em exibir dados do autor dentro de listas de posts.
    """

    id = serializers.CharField(source="profile.id", read_only=True)
    profile_picture = serializers.SerializerMethodField()
    display_name = serializers.ReadOnlyField(source="profile.display_name")
    profile_id = serializers.ReadOnlyField(source="profile.id")
    is_blocked = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "profile_id",
            "username",
            "full_name",
            "display_name",
            "profile_picture",
            "is_blocked",
        ]

    def get_is_blocked(self, obj: User) -> bool:
        """
        Verifica dinamicamente se o usuário logado atualmente bloqueou este autor.
        """
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Block.objects.filter(
                blocker=cast(User, request.user), blocked=obj
            ).exists()
        return False

    def get_profile_picture(self, obj: User) -> str:
        """
        Retorna a imagem de perfil tratada para a listagem do feed.
        """
        request = self.context.get("request")
        profile = obj.profile
        if profile and profile.image_status == "APPROVED" and profile.profile_picture:
            return (
                request.build_absolute_uri(profile.profile_picture.url)
                if request
                else profile.profile_picture.url
            )
        return get_default_avatar_url(request)


class PostSerializer(serializers.ModelSerializer[Post]):
    """
    Serializer completo para manipulação, criação e exibição de Postagens (Posts).
    """

    author = FeedAuthorSerializer(source="user", read_only=True)
    media_url = serializers.SerializerMethodField()
    likes_count = serializers.IntegerField(source="likes.count", read_only=True)
    is_liked = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(source="comments.count", read_only=True)
    user_has_commented = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "author",
            "content",
            "media",
            "is_deleted",
            "media_url",
            "moderation_status",
            "created_at",
            "likes_count",
            "is_liked",
            "comments_count",
            "user_has_commented",
        ]
        read_only_fields = ["id", "author", "created_at", "media_url", "is_deleted"]

    def validate_content(self, value: str) -> str:
        """
        Valida o limite clássico de tamanho do texto de posts (estilo microblog de 280 caracteres).
        """
        if len(value) > 280:
            raise serializers.ValidationError(
                "Your thought is too long! Keep it under 280 characters."
            )
        return value

    def update(self, instance: Post, validated_data: dict[str, Any]) -> Post:
        """
        Permite alterar dados do post e altera o status do perfil se houver 'upload_picture' no payload.
        """
        upload = validated_data.pop("upload_picture", None)
        if upload:
            profile = instance.user.profile
            if profile:
                profile.profile_picture = upload
                profile.image_status = "PENDING"
                profile.save()
        return super().update(instance, validated_data)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """
        Garante em nível global que um post não possa ser enviado totalmente vazio (deve ter texto ou mídia).
        """
        instance = getattr(self, "instance", None)
        content = attrs.get("content", instance.content if instance else "")
        media = attrs.get("media", instance.media if instance else None)
        content_str = (content or "").strip()
        if not (bool(content_str) or bool(media)):
            raise serializers.ValidationError({"detail": "Post não pode ser vazio."})
        return attrs

    def validate_media(self, file: Any) -> Any:
        """
        Garante que arquivos de mídia anexados ao post não estourem o limite de 15MB.
        """
        if not file:
            return file
        if file.size > 15 * 1024 * 1024:
            raise serializers.ValidationError("Media file is too large.")
        return file

    def get_media_url(self, obj: Post) -> Optional[str]:
        return obj.media.url if obj.media else None

    def get_is_liked(self, obj: Post) -> bool:
        """
        Verifica em tempo de execução se o usuário logado deu like neste post.
        """
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=cast(User, request.user)).exists()
        return False

    def get_user_has_commented(self, obj: Post) -> bool:
        """
        Verifica em tempo de execução se o usuário logado possui pelo menos um comentário neste post.
        """
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.comments.filter(author=cast(User, request.user)).exists()
        return False


class ProfileSerializer(serializers.ModelSerializer[Profile]):
    """
    Serializer para controle de dados do perfil público/privado de qualquer usuário.
    """

    user = serializers.ReadOnlyField(source="user.uuid")
    user_id = serializers.ReadOnlyField(source="user.uuid")
    username = serializers.ReadOnlyField(source="user.username")
    email = serializers.ReadOnlyField(source="user.email")
    profile_picture = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    posts = PostSerializer(many=True, read_only=True, source="user.posts")
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "id",
            "user",
            "username",
            "profile_picture",
            "is_blocked",
            "email",
            "user_id",
            "display_name",
            "bio",
            "followers_count",
            "following_count",
            "posts",
            "is_private",
            "is_following",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_is_blocked(self, obj: Profile) -> bool:
        """
        Retorna se o perfil avaliado está bloqueado pelo usuário autenticado.
        """
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Block.objects.filter(
                blocker=cast(User, request.user), blocked=obj.user
            ).exists()
        return False

    def get_profile_picture(self, obj: Profile) -> str:
        request = self.context.get("request")
        if obj.image_status == "APPROVED" and obj.profile_picture:
            return (
                request.build_absolute_uri(obj.profile_picture.url)
                if request
                else obj.profile_picture.url
            )
        return get_default_avatar_url(request)

    def get_is_following(self, obj: Profile) -> bool:
        """
        Checa se o usuário atual segue este perfil (excluindo follows antigos desfeitos).
        """
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Follow.objects.filter(
                follower=cast(User, request.user),
                following=obj.user,
                unfollowed_at__isnull=True,
            ).exists()
        return False

    def to_representation(self, instance: Profile) -> dict[str, Any]:
        """
        Ofusca e restringe dados confidenciais (posts, bio original) caso o perfil
        seja privado e quem esteja vendo não seja o dono nem um seguidor aprovado.
        """
        data = super().to_representation(instance)
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return data

        real_user = cast(User, request.user)
        is_owner = real_user == instance.user
        is_follower = Follow.objects.filter(
            follower=real_user, following=instance.user, unfollowed_at__isnull=True
        ).exists()

        if instance.is_private and not is_owner and not is_follower:
            return {
                "id": data["id"],
                "username": data["username"],
                "display_name": data["display_name"],
                "profile_picture": data["profile_picture"],
                "is_private": True,
                "is_following": False,
                "is_restricted": True,
                "bio": "Este perfil é privado. Segue para ver o conteúdo.",
                "posts": [],
            }
        data["is_restricted"] = False
        return data

    def get_following_count(self, obj: Profile) -> int:
        return int(obj.user.active_following.count())

    def get_followers_count(self, obj: Profile) -> int:
        return int(obj.user.active_followers.count())


class BlockSerializer(serializers.ModelSerializer[Block]):
    """
    Serializer focado na criação de registros de bloqueio entre usuários.
    """

    class Meta:
        model = Block
        fields = ["id", "blocker", "blocked", "created_at"]
        read_only_fields = ["blocker", "created_at"]

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """
        Validação de negócio para impedir que um usuário consiga bloquear a si mesmo.
        """
        user = self.context["request"].user
        if user == attrs["blocked"]:
            raise serializers.ValidationError("Não podes bloquear-te a ti próprio.")
        return attrs


class CommentSerializer(serializers.ModelSerializer[Comment]):
    """
    Serializer para visualização e postagem de comentários em publicações.
    """

    author_name = serializers.ReadOnlyField(source="author.username")
    author_avatar = serializers.SerializerMethodField()
    author_id = serializers.CharField(source="author.profile.id", read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "post",
            "author",
            "author_id",
            "author_name",
            "author_avatar",
            "content",
            "media_url",
            "is_gif",
            "created_at",
            "image",
        ]
        read_only_fields = ["author", "created_at"]

    def get_author_avatar(self, obj: Comment) -> str:
        request = self.context.get("request")
        profile = obj.author.profile
        if profile and profile.image_status == "APPROVED" and profile.profile_picture:
            return (
                request.build_absolute_uri(profile.profile_picture.url)
                if request
                else profile.profile_picture.url
            )
        return get_default_avatar_url(request)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        """
        Garante que o comentário tenha algum conteúdo válido (texto, imagem pura ou link de GIF estruturado).
        """
        instance = getattr(self, "instance", None)
        content = (
            attrs.get("content", instance.content if instance else "") or ""
        ).strip()
        media_url = attrs.get("media_url", instance.media_url if instance else None)
        is_gif = attrs.get("is_gif", instance.is_gif if instance else False)
        image = attrs.get("image", instance.image if instance else None)

        if not (bool(content) or bool(image) or (bool(is_gif) and bool(media_url))):
            raise serializers.ValidationError(
                {"content": "Comentário não pode ficar vazio."}
            )
        return attrs


class FollowUserSerializer(serializers.ModelSerializer[User]):
    """
    Serializer leve focado em fornecer dados em listagens de seguidores/seguindo.
    """

    username = serializers.CharField(read_only=True)
    display_name = serializers.ReadOnlyField(source="profile.display_name")
    profile_picture = serializers.SerializerMethodField()
    profile_id = serializers.ReadOnlyField(source="profile.id")
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "profile_id",
            "username",
            "is_following",
            "display_name",
            "profile_picture",
        ]

    def get_is_following(self, obj: User) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return Follow.objects.filter(
            follower=cast(User, request.user), following=obj, unfollowed_at__isnull=True
        ).exists()

    def get_profile_picture(self, obj: User) -> str:
        request = self.context.get("request")
        profile = obj.author.profile if hasattr(obj, "author") else obj.profile
        if profile and profile.image_status == "APPROVED" and profile.profile_picture:
            return (
                request.build_absolute_uri(profile.profile_picture.url)
                if request
                else profile.profile_picture.url
            )
        return get_default_avatar_url(request)


class NotificationSerializer(serializers.ModelSerializer[Notification]):
    """
    Serializer estruturado para formatação de logs de atividades e notificações na plataforma.
    """

    sender_name = serializers.ReadOnlyField(source="sender.username")
    sender_avatar = serializers.SerializerMethodField()
    sender_uuid = serializers.ReadOnlyField(source="sender.profile.id")
    post_author_profile_id = serializers.SerializerMethodField()
    post_id = serializers.ReadOnlyField(source="post.id")

    class Meta:
        model = Notification
        fields = [
            "id",
            "sender_uuid",
            "sender_name",
            "sender_avatar",
            "notification_type",
            "post_id",
            "post_author_profile_id",
            "is_read",
            "created_at",
        ]

    def get_post_author_profile_id(self, obj: Notification) -> Optional[Any]:
        """
        Busca preventivamente o ID de perfil do dono do post sem quebrar se o post for nulo.
        """
        if obj.post:
            author = getattr(obj.post, "user", None)
            if author and author.profile:
                return author.profile.id
        return None

    def get_sender_avatar(self, obj: Notification) -> Optional[str]:
        if obj.sender and obj.sender.profile and obj.sender.profile.profile_picture:
            request = self.context.get("request")
            return (
                request.build_absolute_uri(obj.sender.profile.profile_picture.url)
                if request
                else obj.sender.profile.profile_picture.url
            )
        return None


class ReportCreateSerializer(serializers.ModelSerializer[Report]):
    """
    Serializer focado na criação de denúncias, preenchendo automaticamente o denunciante.
    """

    # Preenche o campo reporter automaticamente capturando o usuário que fez a requisição HTTP
    reporter = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Report
        fields = ["post", "reason", "description", "reporter"]


class ReportAdminSerializer(serializers.ModelSerializer[Report]):
    """
    Serializer administrativo plano para listagem de reports no painel de moderação.
    """

    reporter_username = serializers.ReadOnlyField(source="reporter.username")
    post_content = serializers.ReadOnlyField(source="post.content")

    class Meta:
        model = Report
        fields = "__all__"


class ModerationUserSerializer(serializers.ModelSerializer[User]):
    """
    Serializer leve focado em retornar imagens e status para filas de moderação de fotos.
    """

    profile_picture = serializers.ImageField(
        source="profile.profile_picture", read_only=True
    )
    image_status = serializers.CharField(source="profile.image_status", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "profile_picture", "image_status"]


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Customização do comportamento padrão de emissão de Tokens JWT da biblioteca SimpleJWT.
    """

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        data = cast(dict[str, Any], super().validate(attrs))

        # Intercepta a autenticação para barrar usuários que foram marcados como banidos
        if self.user and self.user.is_banned:
            reason = self.user.ban_reason or "Violação dos termos de uso."
            raise exceptions.PermissionDenied(
                {
                    "detail": "Sua conta foi suspensa.",
                    "ban_reason": reason,
                }
            )

        # Insere os dados tratados do perfil do usuário diretamente na resposta de login obtida
        data["user"] = UserProfileSerializer(
            cast(User, self.user),
            context={"request": self.context.get("request")},
        ).data

        return data
