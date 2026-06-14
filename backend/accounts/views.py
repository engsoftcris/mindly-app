# pylint: disable=arguments-renamed, consider-using-set-comprehension, consider-using-in
from datetime import timedelta
from typing import TYPE_CHECKING, cast

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.shortcuts import render
from django.utils.timezone import now
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from social_core.exceptions import AuthTokenError, MissingBackend
from social_django.utils import load_backend, load_strategy

from .models import Block, Comment, Follow, Like, Notification, Post, Profile, Report
from .serializers import (
    CommentSerializer,
    FollowUserSerializer,
    ChangePasswordSerializer,
    GoogleAuthSerializer,
    RegisterSerializer,
    MyTokenObtainPairSerializer,
    NotificationSerializer,
    PostSerializer,
    ProfileSerializer,
    ReportAdminSerializer,
    ReportCreateSerializer,
    UserProfileSerializer,
)

# Garante tipagem estática correta sem causar loops de importação em runtime
if TYPE_CHECKING:
    from django.contrib.auth.models import AnonymousUser
    from .models import User as UserModel

# Obtém o modelo de Usuário customizado configurado no settings.py
User = get_user_model()


# --- ROOT API ---
class ApiRootView(APIView):
    """
    Ponto de entrada inicial (Root) da API para checagem de status do servidor.
    Renderiza um template HTML simples informando que o sistema está online.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        context = {"status": "online", "timestamp": now().isoformat()}
        return render(request, "api.html", context)


# --- AUTHENTICATION ---


class RegisterView(generics.CreateAPIView):  # type: ignore[type-arg]
    """
    Endpoint para registro/cadastro de novos usuários locais (e-mail e senha).
    """

    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def perform_create(self, serializer):
        # Primeiro, salva o usuário usando a lógica limpa e validada do Serializer
        user = serializer.save()
        # Define explicitamente que o provedor deste usuário é "local"
        user.provider = "local"
        user.save(update_fields=["provider"])


class GoogleLoginView(APIView):
    """
    Endpoint de Login via Google OAuth2.
    Valida o access_token recebido e autentica o usuário caso ele já possua cadastro.
    """

    permission_classes = [AllowAny]

    # pylint: disable=too-many-return-statements
    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_token = serializer.validated_data["access_token"]
        strategy = load_strategy(request)

        try:
            # Carrega o backend do Google OAuth2 fornecido pelo python-social-auth
            backend = load_backend(
                strategy=strategy, name="google-oauth2", redirect_uri=None
            )

            # Recupera os dados do usuário vindos diretamente dos servidores do Google
            user_data = backend.user_data(access_token)
            email = user_data.get("email")
            social_id = user_data.get("id")

            if not email:
                return Response(
                    {"error": "O Google não forneceu um e-mail válido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Busca se o e-mail retornado pelo Google já existe na base de dados
            user = User.objects.filter(email=email).first()

            # SE NÃO EXISTIR: Bloqueia o login, exigindo que o usuário faça o cadastro primeiro
            if not user:
                return Response(
                    {
                        "error": "user_not_registered",
                        "message": "Conta não encontrada. Vá em 'Criar Conta' primeiro.",
                    },
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Se o usuário já existe localmente mas não tinha o vínculo social atualizado, ajusta-o
            if user.social_id != str(social_id) or user.provider != "google":
                user.social_id = str(social_id)
                user.provider = "google"
                user.save(update_fields=["social_id", "provider"])

        except (MissingBackend, AuthTokenError) as e:
            return Response(
                {"error": "Token do Google inválido ou expirado", "details": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:  # pylint: disable=broad-exception-caught
            return Response(
                {"error": "Erro no processamento", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Validações de segurança adicionais pós-autenticação do Google
        if not user.is_active:
            return Response(
                {"error": "Usuário desativado"}, status=status.HTTP_401_UNAUTHORIZED
            )
        if user.is_banned:
            return Response(
                {"error": "Conta banida.", "reason": user.ban_reason},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Gera o par de tokens JWT (Access/Refresh) para manter o usuário logado
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserProfileSerializer(user, context={"request": request}).data,
            },
            status=status.HTTP_200_OK,
        )


class MyTokenObtainPairView(TokenObtainPairView):
    """
    Customização do endpoint padrão do SimpleJWT para login via e-mail e senha tradicionais.
    """

    serializer_class = MyTokenObtainPairSerializer


class ChangePasswordView(APIView):
    """
    Endpoint para alteração de senha de usuários autenticados.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        current_password = serializer.validated_data.get("current_password")
        new_password = serializer.validated_data["new_password"]

        # Se for uma conta local com senha utilizável, exige a validação da senha atual
        if user.has_usable_password():
            if not current_password:
                return Response({"error": "Current password is required."}, status=400)

            if not user.check_password(current_password):
                return Response({"error": "Current password is incorrect."}, status=400)

        # Define a nova senha com hash seguro do Django (funciona para novas e antigas contas Google)
        user.set_password(new_password)
        user.save()

        return Response({"message": "Password updated successfully."}, status=200)


class FeedPagination(PageNumberPagination):
    """
    Configuração de paginação padrão para as listagens de feeds e postagens.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


# --- PROFILES & SOCIAL LOGIC ---


class GoogleFinishRegisterView(APIView):
    """
    Endpoint para a conclusão ou criação direta de contas autenticadas via Google OAuth2.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_token = serializer.validated_data["access_token"]
        strategy = load_strategy(request)

        try:
            backend = load_backend(
                strategy=strategy, name="google-oauth2", redirect_uri=None
            )
            user_data = backend.user_data(access_token)
            email = user_data.get("email")
            social_id = user_data.get("id")
            full_name = user_data.get("name")

            if not email:
                return Response(
                    {"error": "E-mail inválido do Google."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = User.objects.filter(email=email).first()

            # SE NÃO EXISTIR: Cria uma nova instância de usuário usando os dados públicos do Google
            if not user:
                user = User(
                    email=email,
                    social_id=str(social_id),
                    full_name=full_name,
                    provider="google",
                )
                user.username = user.generate_unique_username()
                user.set_unusable_password()  # Contas sociais puras não têm senha local inicial
                user.save()
            else:
                # Se o usuário já existia, garante que o vínculo social está devidamente registrado
                if user.social_id != str(social_id) or user.provider != "google":
                    user.social_id = str(social_id)
                    user.provider = "google"
                    user.save(update_fields=["social_id", "provider"])

            # Realiza o login automático imediatamente após a criação ou verificação bem-sucedida
            refresh = RefreshToken.for_user(user)
            user_data_serialized = UserProfileSerializer(
                user, context={"request": request}
            ).data

            return Response(
                {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "user": user_data_serialized,
                },
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:  # pylint: disable=broad-exception-caught
            return Response(
                {"error": "Erro ao registrar com Google", "details": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ProfileViewSet(viewsets.ModelViewSet[Profile]):
    """
    ViewSet que lida com perfis dos usuários e todas as ações de interação social:
    Seguir, Parar de Seguir, Bloquear e Listar conexões.
    """

    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = cast("UserModel", self.request.user)
        if not user.is_authenticated:
            return Profile.objects.none()

        # Filtro de Privacidade Extremo: Captura quem você bloqueou E quem te bloqueou
        blocked_ids = Block.objects.filter(blocker=user).values_list(
            "blocked_id", flat=True
        )
        blocked_by_ids = Block.objects.filter(blocked=user).values_list(
            "blocker_id", flat=True
        )
        all_blocked = set(list(blocked_ids) + list(blocked_by_ids))

        # Filtra o queryset para remover usuários bloqueados, banidos ou a si mesmo dependendo da action
        queryset = (
            Profile.objects.select_related("user")
            .prefetch_related("user__posts", "user__followers", "user__following")
            .exclude(Q(user__id__in=all_blocked) | Q(user__is_banned=True))
        )
        if self.action in ["list", "suggestions_followers"]:
            queryset = queryset.exclude(user=user)
        return queryset.order_by("user__username")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def get_object(self):
        # Otimização para recuperar o objeto de perfil correto baseado na Primary Key (PK) nas rotas personalizadas
        if self.action in ["block_user", "follow_toggle", "connections"]:
            pk = self.kwargs.get("pk")
            if not pk:
                raise PermissionDenied("PK missing")
            return Profile.objects.get(pk=pk)
        return super().get_object()

    @action(detail=False, methods=["get"], url_path="blocked-users")
    def blocked_users(self, request):
        """Retorna uma lista contendo os perfis de todos os usuários que você bloqueou."""
        me = cast("UserModel", request.user)
        blocked_relations = Block.objects.filter(blocker=me).select_related("blocked")
        blocked_profiles = Profile.objects.filter(
            user__in=[relation.blocked for relation in blocked_relations]
        )
        serializer = ProfileSerializer(
            blocked_profiles, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="block")
    def block_user(self, request, pk=None):  # pylint: disable=unused-argument
        """Action para alternar o status de bloqueio (Bloquear / Desbloquear usuário)."""
        profile_to_block = self.get_object()
        user_to_block = profile_to_block.user
        me = cast("UserModel", request.user)

        if me == user_to_block:
            return Response({"error": "Auto-bloqueio não permitido."}, status=400)

        block_exists = Block.objects.filter(blocker=me, blocked=user_to_block)
        if block_exists.exists():
            # Se já estiver bloqueado, efetua o desbloqueio
            block_exists.delete()
            return Response({"message": "Utilizador desbloqueado."}, status=200)

        # Caso contrário, cria o registro de bloqueio e desfaz qualquer vínculo de follow mútuo imediatamente
        Block.objects.create(blocker=me, blocked=user_to_block)
        Follow.objects.filter(
            Q(follower=me, following=user_to_block)
            | Q(follower=user_to_block, following=me)
        ).delete()
        me.following.remove(user_to_block)
        user_to_block.following.remove(me)
        return Response({"message": "Utilizador bloqueado com sucesso."}, status=201)

    @action(detail=True, methods=["get"], url_path="connections")
    def connections(self, request, pk=None):  # pylint: disable=unused-argument
        """Retorna a lista limpa de seguidores (followers) ou seguindo (following) de um perfil."""
        profile = self.get_object()
        user_logado = cast("UserModel", request.user)
        connection_type = request.query_params.get("type", "followers")

        if connection_type == "following":
            # Filtra apenas os registros onde 'unfollowed_at' é nulo (ou seja, ativos no momento)
            following_ids = list(
                Follow.objects.filter(
                    follower=profile.user, unfollowed_at__isnull=True
                ).values_list("following_id", flat=True)
            )
            queryset = User.objects.filter(id__in=following_ids)
        else:
            followers_ids = list(
                Follow.objects.filter(
                    following=profile.user, unfollowed_at__isnull=True
                ).values_list("follower_id", flat=True)
            )
            queryset = User.objects.filter(id__in=followers_ids)

        # Garante proteção de dados: remove qualquer bloqueado da listagem exibida
        if user_logado.is_authenticated:
            blocked_ids = list(
                Block.objects.filter(blocker=user_logado).values_list(
                    "blocked_id", flat=True
                )
            )
            blocked_by_ids = list(
                Block.objects.filter(blocked=user_logado).values_list(
                    "blocker_id", flat=True
                )
            )
            all_blocked = set(blocked_ids + blocked_by_ids)
            queryset = queryset.exclude(id__in=all_blocked)

        queryset = queryset.distinct()
        serializer = FollowUserSerializer(
            queryset, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="follow")
    def follow_toggle(self, request, pk=None):  # pylint: disable=unused-argument
        """
        Alterna o status de seguimento (Follow / Unfollow).
        Possui uma regra de negócio de Cooldown (Bloqueio temporário de re-follow por 48 horas).
        """
        target_profile = self.get_object()
        target_user = target_profile.user
        me = cast("UserModel", request.user)

        if me == target_user:
            return Response({"error": "You cannot follow yourself."}, status=400)
        if Block.objects.filter(
            Q(blocker=target_user, blocked=me) | Q(blocker=me, blocked=target_user)
        ).exists():
            return Response({"error": "Action unavailable due to blocks."}, status=403)

        follow_obj = Follow.all_objects.filter(
            follower=me, following=target_user
        ).first()

        # Caso 1: Usuário já está seguindo -> Executa o Unfollow salvando a data atual
        if follow_obj and follow_obj.unfollowed_at is None:
            follow_obj.unfollowed_at = now()
            follow_obj.save(update_fields=["unfollowed_at"])
            return Response(
                {
                    "is_following": False,
                    "message": "Unfollowed.",
                    "can_follow_again": follow_obj.can_follow_again(),
                },
                status=200,
            )

        # Caso 2: Usuário já seguiu antes e deu unfollow -> Checa se o Cooldown expirou
        if follow_obj and follow_obj.unfollowed_at is not None:
            if not follow_obj.can_follow_again():
                remaining = follow_obj.unfollowed_at + timedelta(hours=48) - now()
                hours_remaining = int(remaining.total_seconds() // 3600)
                return Response(
                    {
                        "error": f"Wait {hours_remaining} minutes before following again.",
                        "cooldown": True,
                        "hours_remaining": hours_remaining,
                    },
                    status=429,
                )

            # Cooldown limpo -> Permite re-seguir limpando o carimbo de data de unfollow
            follow_obj.unfollowed_at = None
            follow_obj.save(update_fields=["unfollowed_at"])
            return Response(
                {"is_following": True, "message": "Following again."}, status=200
            )

        # Caso 3: Primeiro follow da história entre os usuários
        Follow.objects.create(follower=me, following=target_user)
        return Response({"is_following": True, "message": "Following."}, status=201)

    @action(detail=False, methods=["get"], url_path="relationships-sync")
    def relationships_sync(self, request):
        """Retorna uma sincronização rápida de UUIDs de quem o usuário segue, seguidores e bloqueados."""
        user = cast("UserModel", request.user)

        following_uuids = list(
            Follow.objects.filter(
                follower=user, unfollowed_at__isnull=True
            ).values_list("following__profile__id", flat=True)
        )

        followers_uuids = list(
            Follow.objects.filter(
                following=user, unfollowed_at__isnull=True
            ).values_list("follower__profile__id", flat=True)
        )

        blocked_uuids = list(
            Block.objects.filter(blocker=user).values_list(
                "blocked__profile__id", flat=True
            )
        )

        return Response(
            {
                "following": [str(uid) for uid in following_uuids],
                "followers": [str(uid) for uid in followers_uuids],
                "blockedUsers": [str(uid) for uid in blocked_uuids],
            },
            status=200,
        )


class UserProfileView(generics.RetrieveUpdateAPIView):  # type: ignore[type-arg]
    """
    Endpoint para ler ou atualizar os dados cadastrais privados do próprio usuário logado.
    """

    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return cast("UserModel", self.request.user)

    def get_serializer_context(self):
        return {"request": self.request}


# --- POSTS & FEED ---


class PostViewSet(viewsets.ModelViewSet[Post]):
    """
    ViewSet completo (CRUD) para gerenciar Publicações (Posts).
    Filtra posts de usuários banidos, deletados, privados ou de blocos mútuos.
    """

    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (
        MultiPartParser,
        FormParser,
    )  # Permite o upload de arquivos de mídia (imagens/vídeo)

    def get_queryset(self):
        user = cast("UserModel", self.request.user)
        # Identifica todas as IDs envolvidas em relacionamentos de bloqueio
        blocked_ids = Block.objects.filter(
            Q(blocker=user) | Q(blocked=user)
        ).values_list("blocker_id", "blocked_id")
        all_blocks = set([item for sublist in blocked_ids for item in sublist])

        return (
            Post.objects.select_related("user", "user__profile")
            .prefetch_related(
                "likes", "comments", "comments__author", "comments__author__profile"
            )
            .filter(user__is_banned=False, is_deleted=False)
            # Regra de privacidade: Mostra posts se o perfil for público ou se for o próprio dono visualizando
            .filter(Q(user__profile__is_private=False) | Q(user=user))
            .exclude(user__id__in=all_blocks)
            .distinct()
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        # Vincula o criador do post automaticamente ao salvar
        instance = serializer.save(user=cast("UserModel", self.request.user))
        # Limpa descritores de arquivos temporários da memória para evitar vazamento (memory leak)
        if instance.media:
            try:
                if hasattr(instance.media, "file"):
                    instance.media.file.close()
                del instance.media.file
            except Exception as e:  # pylint: disable=broad-exception-caught
                print(f"Erro ao limpar temporários: {e}")

    def destroy(self, request, *args, **kwargs):
        # Validação manual de posse antes de deletar
        instance = self.get_object()
        if instance.user != cast("UserModel", request.user):
            return Response({"error": "Sem permissão."}, status=403)
        instance.delete()
        return Response({"message": "Removido."}, status=204)

    def perform_update(self, serializer):
        # Validação manual antes de editar e reseta o status de moderação para análise
        if serializer.instance.user != cast("UserModel", self.request.user):
            raise PermissionDenied("Não podes editar.")
        serializer.save(moderation_status="PENDING")

    @action(detail=True, methods=["post"], url_path="like")
    def toggle_like(self, _request, pk=None):  # pylint: disable=unused-argument
        """Action para Curtir / Remover curtida de um post."""
        post = self.get_object()
        user = cast("UserModel", self.request.user)
        like_queryset = Like.objects.filter(user=user, post=post)

        if like_queryset.exists():
            like_queryset.delete()
            is_liked = False
        else:
            Like.objects.create(user=user, post=post)
            is_liked = True

        post.refresh_from_db()
        return Response(
            {"is_liked": is_liked, "likes_count": post.likes.count()}, status=200
        )


class HybridFeedView(generics.ListAPIView[Post]):
    """
    Gera o Feed do usuário contendo unicamente as postagens de quem ele está seguindo de verdade.
    """

    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = FeedPagination

    def get_queryset(self):
        user = cast("UserModel", self.request.user)

        # Captura IDs de quem eu sigo atualmente
        following_ids = Follow.objects.filter(
            follower=user, unfollowed_at__isnull=True
        ).values_list("following_id", flat=True)

        # Captura os bloqueios bilaterais
        blocked_ids = Block.objects.filter(blocker=user).values_list(
            "blocked_id", flat=True
        )
        blocked_by_ids = Block.objects.filter(blocked=user).values_list(
            "blocker_id", flat=True
        )
        all_blocked = set(list(blocked_ids) + list(blocked_by_ids))

        queryset = (
            Post.objects.select_related("user", "user__profile")
            .prefetch_related("likes", "comments")
            .annotate(num_likes=Count("likes"))
            .filter(
                user__is_banned=False,
                is_deleted=False,
                user__id__in=following_ids,  # 🔥 Regra essencial: APENAS seguidos
            )
            .exclude(
                Q(user=user) | Q(user__id__in=all_blocked) | Q(user__is_superuser=True)
            )
            .distinct()
            .order_by("-created_at")
        )
        return queryset


class UserPostsListView(generics.ListAPIView[Post]):
    """
    Exibe a lista de posts específicos contidos no perfil de um determinado usuário. Suporta filtros por mídia (fotos/vídeos).
    """

    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = FeedPagination

    def get_queryset(self):
        profile_id = self.kwargs.get("pk")
        user = cast("UserModel", self.request.user)

        try:
            profile = Profile.objects.get(id=profile_id)
            if profile.user.is_banned:
                return Post.objects.none()
        except Profile.DoesNotExist:
            return Post.objects.none()

        queryset = Post.objects.filter(user__profile__id=profile_id).exclude(
            moderation_status="REJECTED"
        )

        # Checagem de visibilidade de conta privada
        is_owner = profile.user == user
        is_follower = (
            user.following.filter(id=profile.user.id).exists()
            if user.is_authenticated
            else False
        )

        if profile.is_private and not is_owner and not is_follower:
            return Post.objects.none()

        # Filtros condicionais por parâmetros na URL (?media_only=true&type=image)
        media_only = self.request.query_params.get("media_only")
        media_type = self.request.query_params.get("type")

        if media_only == "true":
            queryset = queryset.exclude(media__isnull=True).exclude(media="")
            if media_type == "image":
                queryset = queryset.filter(
                    Q(media__icontains=".jpg")
                    | Q(media__icontains=".jpeg")
                    | Q(media__icontains=".png")
                    | Q(media__icontains=".webp")
                )
            elif media_type == "video":
                queryset = queryset.filter(
                    Q(media__icontains=".mp4")
                    | Q(media__icontains=".mov")
                    | Q(media__icontains=".avi")
                )
        return queryset.order_by("-created_at")


class CommentViewSet(viewsets.ModelViewSet[Comment]):
    """
    ViewSet para CRUD e controle de comentários de posts.
    """

    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Filtra os comentários vinculados a uma ID de Post específico via query param (?post_id=...)
        post_id = self.request.query_params.get("post_id")
        return (
            Comment.objects.filter(post_id=post_id).order_by("-created_at")
            if post_id
            else Comment.objects.all()
        )

    def perform_create(self, serializer):
        serializer.save(author=cast("UserModel", self.request.user))

    def perform_update(self, serializer):
        if self.get_object().author != cast("UserModel", self.request.user):
            raise PermissionDenied("Sem permissão.")
        serializer.save()

    def perform_destroy(self, instance):
        # Regra Hierárquica: O autor do comentário OU o dono da publicação original podem deletar o comentário
        user = cast("UserModel", self.request.user)
        if instance.author == user or instance.post.user == user:
            instance.delete()
        else:
            raise PermissionDenied("Sem autoridade.")


# --- NOTIFICATIONS ---


class NotificationViewSet(viewsets.ReadOnlyModelViewSet[Notification]):
    """
    Listagem de notificações do usuário. Apenas leitura.
    Oculta notificações originadas por usuários bloqueados ou banidos.
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = cast("UserModel", self.request.user)
        blocked_ids = Block.objects.filter(blocker=user).values_list(
            "blocked_id", flat=True
        )
        blocked_by_ids = Block.objects.filter(blocked=user).values_list(
            "blocker_id", flat=True
        )
        all_blocked = set(list(blocked_ids) + list(blocked_by_ids))

        return (
            Notification.objects.filter(recipient=user)
            .exclude(Q(sender__id__in=all_blocked) | Q(sender__is_banned=True))
            .select_related("sender", "sender__profile", "post")
            .order_by("-created_at")
        )

    @action(detail=True, methods=["post"], url_path="mark_as_read")
    def mark_as_read(self, _request, pk=None):  # pylint: disable=unused-argument
        """Action para marcar uma notificação específica como lida."""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(
            {"status": "notification marked as read"}, status=status.HTTP_200_OK
        )


# --- REPORTS & MODERATION ---


class ReportViewSet(viewsets.ModelViewSet[Report]):
    """
    Gerenciamento de Denúncias (Reports). Usuários comuns criam, apenas Admins listam.
    """

    queryset = Report.objects.all()

    def get_serializer_class(self):
        # Altera dinamicamente o nível de exibição de dados se for criação ou visualização administrativa
        return (
            ReportCreateSerializer if self.action == "create" else ReportAdminSerializer
        )

    def get_permissions(self):
        # Apenas administradores do sistema acessam rotas além do POST de criação
        return (
            [permissions.IsAuthenticated()]
            if self.action == "create"
            else [permissions.IsAdminUser()]
        )

    def create(self, request, *args, **kwargs):
        # Evita SPAM: Impede que o mesmo usuário envie múltiplas denúncias ao mesmo post
        post_id, user = request.data.get("post"), cast("UserModel", request.user)
        if Report.objects.filter(reporter=user, post_id=post_id).exists():
            return Response({"detail": "Já denunciaste."}, status=400)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(reporter=user)
        return Response(serializer.data, status=201)


class ModerationViewSet(viewsets.ViewSet):
    """
    Painel de controle exclusivo para administradores gerenciarem fotos de perfil pendentes.
    """

    permission_classes = [permissions.IsAdminUser]

    @action(detail=False, methods=["get"])
    def pending_users(self, request):  # pylint: disable=unused-argument
        """Lista todos os perfis cuja imagem de perfil aguarda aprovação da moderação."""
        profiles = Profile.objects.filter(image_status="PENDING")
        serializer = ProfileSerializer(
            profiles, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def approve_user(self, _request, pk=None):
        """Aprova a foto de perfil de um usuário."""
        try:
            profile = Profile.objects.get(pk=pk)
            profile.image_status = "APPROVED"
            profile.save()
            return Response({"status": "approved"})
        except Profile.DoesNotExist:
            return Response({"error": "Profile not found"}, status=404)


# --- SUGGESTIONS & SEARCH ---


class SuggestedFollowsView(generics.ListAPIView[Profile]):
    """
    Gera recomendações de novos perfis públicos de forma aleatória para seguir.
    Otimizado convertendo avaliações em listas para evitar gargalos SQL.
    """

    serializer_class = ProfileSerializer

    def get_queryset(self):
        user = cast("UserModel", self.request.user)
        if not user.is_authenticated:
            return Profile.objects.none()

        # Converte as relações críticas para listas nativas, prevenindo queries aninhadas lentas (Subselects)
        following_ids = list(
            Follow.objects.filter(
                follower=user, unfollowed_at__isnull=True
            ).values_list("following_id", flat=True)
        )
        blocked_ids = list(
            Block.objects.filter(blocker=user).values_list("blocked_id", flat=True)
        )
        blocked_by_ids = list(
            Block.objects.filter(blocked=user).values_list("blocker_id", flat=True)
        )
        all_blocked = set(blocked_ids + blocked_by_ids)

        # Constrói os filtros bases de elegibilidade
        queryset = Profile.objects.filter(
            is_private=False, user__is_superuser=False, user__is_active=True
        ).exclude(user=user)

        if following_ids:
            queryset = queryset.exclude(user__id__in=following_ids)
        if all_blocked:
            queryset = queryset.exclude(user__id__in=all_blocked)

        # Ordenação aleatória em nível do Banco de Dados limitada ao máximo de 5 sugestões
        return queryset.order_by("?")[:5]


class UserSearchView(generics.ListAPIView[Profile]):
    """
    Realiza a busca textual de perfis pelo nome de exibição ou username.
    Aplica filtros rigorosos de exclusão (Bloqueados, Banidos, Seguidos).
    """

    serializer_class = ProfileSerializer

    def get_queryset(self):
        user, query = cast(
            "UserModel", self.request.user
        ), self.request.query_params.get("q", None)

        if not query:
            return Profile.objects.none()

        # 1. Identificar bloqueios mútuos
        blocked_ids = Block.objects.filter(blocker=user).values_list(
            "blocked_id", flat=True
        )
        blocked_by_ids = Block.objects.filter(blocked=user).values_list(
            "blocker_id", flat=True
        )
        all_blocked = set(list(blocked_ids) + list(blocked_by_ids))

        # 2. Identificar quem o usuário logado já segue (não faz sentido sugerir na pesquisa para seguir de novo)
        following_ids = Follow.objects.filter(
            follower=user, unfollowed_at__isnull=True
        ).values_list("following_id", flat=True)

        # 3. Executa a filtragem por texto insensível a maiúsculas/minúsculas (__icontains)
        return (
            Profile.objects.filter(
                Q(user__username__icontains=query)
                | Q(user__full_name__icontains=query),
                user__is_active=True,
                user__is_superuser=False,
                user__is_banned=False,  # Remove Banidos
            )
            .exclude(
                Q(user__id__in=all_blocked)  # Remove Bloqueados
                | Q(user__id__in=following_ids)  # Remove quem já Segue
                | Q(user=user)  # Remove o próprio buscador
            )
            .distinct()[:10]  # Limita aos 10 melhores resultados iniciais
        )
