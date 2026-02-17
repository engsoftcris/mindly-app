import uuid
from io import BytesIO
from PIL import Image

from django.core.files.base import ContentFile
import os
from rest_framework import serializers
from .models import Post, User, Profile
from .models import Block, Follow



class UserProfileSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()
    upload_picture = serializers.ImageField(write_only=True, required=False)
    username = serializers.CharField(read_only=True)
    # ADICIONE ISSO AQUI TAMBÉM
    display_name = serializers.ReadOnlyField(source='profile.display_name')

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "full_name",
            "display_name", # <--- Adicione aqui
            "bio",
            "profile_picture",
            "upload_picture",
            "social_id",
            "provider",
        ]
        read_only_fields = ["id", "username"]

    def get_profile_picture(self, obj):
        request = self.context.get("request")

        # LÓGICA TAL-12: Só exibe a URL original se estiver APROVADA
        if obj.image_status == "APPROVED" and obj.profile_picture:
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url

        # Caso contrário (PENDING ou REJECTED), retorna o fallback
        # Certifique-se de ter essa imagem em static/images/
        if request:
            return request.build_absolute_uri("/static/images/default-avatar.png")
        return "/static/images/default-avatar.png"

    def validate_upload_picture(self, image):
        if image.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("A imagem deve ter no máximo 2MB.")
        return image

    def update(self, instance, validated_data):
        upload = validated_data.pop("upload_picture", None)

        if upload:
            # LÓGICA TAL-12: Se subiu imagem nova, o status volta a ser PENDING
            instance.image_status = "PENDING"

            img = Image.open(upload)
            img = img.convert("RGB")
            img.thumbnail((512, 512))

            buffer = BytesIO()
            img.save(buffer, format="JPEG", quality=85)
            buffer.seek(0)

            filename = f"{uuid.uuid4().hex}.jpg"

            if instance.profile_picture:
                instance.profile_picture.delete(save=False)

            instance.profile_picture.save(
                filename,
                ContentFile(buffer.read()),
                save=False,
            )

        return super().update(instance, validated_data)

class RegisterSerializer(serializers.ModelSerializer):
    # Adicionamos a password aqui para o serializer saber ler do payload do teste
    password = serializers.CharField(write_only=True, required=True)
    full_name = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'full_name', 'password') # Adicionado password aqui

    def create(self, validated_data):
        # Agora o validated_data terá a 'password' enviada pelo teste!
        return User.objects.create_user(**validated_data)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este e-mail já está em uso.")
        return value

class GoogleAuthSerializer(serializers.Serializer):
    access_token = serializers.CharField()

# 1. Create a lightweight version for the feed (only ID, name, and photo)
class FeedAuthorSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()
    # BUSCA O DISPLAY_NAME DO PERFIL ASSOCIADO AO USER
    display_name = serializers.ReadOnlyField(source='profile.display_name')
    id = serializers.ReadOnlyField(source='profile.id')

    class Meta:
        model = User
        # ADICIONE 'display_name' NA LISTA ABAIXO
        fields = ['id', 'username', 'full_name', 'display_name', 'profile_picture']

    def get_profile_picture(self, obj):
        # ... (sua lógica atual da foto continua igual)
        request = self.context.get("request")
        if obj.image_status == "APPROVED" and obj.profile_picture:
            return request.build_absolute_uri(obj.profile_picture.url) if request else obj.profile_picture.url
        path = "/static/images/default-avatar.png"
        return request.build_absolute_uri(path) if request else path
    
class PostSerializer(serializers.ModelSerializer):
    author = FeedAuthorSerializer(source='user', read_only=True)
    media_url = serializers.SerializerMethodField()  # ✅ ADICIONA ISSO

    class Meta:
        model = Post
        fields = ['id', 'author', 'content', 'media', 'is_deleted', 'media_url', 'moderation_status', 'created_at']  # ✅ ADD AQUI
        read_only_fields = ['id', 'author', 'created_at', 'media_url', 'is_deleted']

    def validate_content(self, value):
        if len(value) > 280:
            raise serializers.ValidationError("Your thought is too long! Keep it under 280 characters.")
        return value

    def validate_media(self, file):
        if not file:
            return file

        max_mb = 15
        if file.size > max_mb * 1024 * 1024:
            raise serializers.ValidationError(f"Media file is too large (max {max_mb}MB).")

        name = (file.name or "").lower()
        ext = os.path.splitext(name)[1]

        allowed = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov", ".webm", ".mkv", ".avi"}
        if ext not in allowed:
            raise serializers.ValidationError("Unsupported file type.")

        content_type = getattr(file, "content_type", None)
        if content_type and not (content_type.startswith("image/") or content_type.startswith("video/")):
            raise serializers.ValidationError("Invalid media content type.")

        return file

    def get_media_url(self, obj):
        return obj.media.url if obj.media else None

class ProfileSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.id')
    username = serializers.ReadOnlyField(source='user.username')
    email = serializers.ReadOnlyField(source='user.email')
    profile_picture = serializers.SerializerMethodField()
    # 1. Adicione o campo aqui para ele ser calculado
    is_following = serializers.SerializerMethodField()
    posts = PostSerializer(many=True, read_only=True, source='user.posts')

    class Meta:
        model = Profile
        # 2. Garanta que is_private e is_following estejam aqui
        fields = ['id','user', 'username', 'email', 'display_name', 'bio', 'profile_picture', 'posts', 'is_private', 'is_following', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_profile_picture(self, obj):
        # ... sua lógica atual (mantenha como está)
        user = obj.user
        request = self.context.get("request")
        if user.image_status == "APPROVED" and user.profile_picture:
            return request.build_absolute_uri(user.profile_picture.url) if request else user.profile_picture.url
        path = "/static/images/default-avatar.png"
        return request.build_absolute_uri(path) if request else path
    
    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # O Segredo: obj é um Profile, então usamos obj.user 
            # para comparar com o campo 'following' do model Follow
            return Follow.objects.filter(
                follower=request.user, 
                following=obj.user,  # Aqui deve ser obj.user
                unfollowed_at__isnull=True
            ).exists()
        return False

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        
        if not request or not request.user.is_authenticated:
            return data

        is_owner = request.user == instance.user
        
        # AJUSTE: Usando a tabela Follow explicitamente para checar privacidade
        is_follower = Follow.objects.filter(
            follower=request.user, 
            following=instance.user, 
            unfollowed_at__isnull=True
        ).exists()

        if instance.is_private and not is_owner and not is_follower:
            return {
                'id': data['id'],
                'username': data['username'],
                'display_name': data['display_name'],
                'profile_picture': data['profile_picture'],
                'is_private': True,
                'is_following': False,
                'is_restricted': True,
                'bio': "Este perfil é privado. Segue para ver o conteúdo.",
                'posts': []
            }
        
        data['is_restricted'] = False
        return data

class BlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = Block
        fields = ['id', 'blocker', 'blocked', 'created_at']
        read_only_fields = ['blocker', 'created_at']

    def validate(self, data):
        if self.context['request'].user == data['blocked']:
            raise serializers.ValidationError("Não podes bloquear-te a ti próprio.")
        return data