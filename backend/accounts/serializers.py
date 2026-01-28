import uuid
from io import BytesIO
from PIL import Image

from django.core.files.base import ContentFile
from rest_framework import serializers
from accounts.models import User


class UserProfileSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()
    upload_picture = serializers.ImageField(write_only=True, required=False)
    username = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "full_name",
            "bio",
            "profile_picture",
            "upload_picture",
            "social_id",
            "provider",
            "is_private",
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