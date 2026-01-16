import uuid
from io import BytesIO
from PIL import Image

from django.core.files.base import ContentFile
from rest_framework import serializers
from .models import User


class UserProfileSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()
    upload_picture = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "full_name",
            "bio",
            "profile_picture",
            "upload_picture",
            "social_id",
            "provider",
        ]
        read_only_fields = ["id"]

    def get_profile_picture(self, obj):
        request = self.context.get("request")
        if obj.profile_picture and request:
            return request.build_absolute_uri(obj.profile_picture.url)
        return None

    def validate_upload_picture(self, image):
        if image.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("A imagem deve ter no máximo 2MB.")
        return image

    def update(self, instance, validated_data):
        upload = validated_data.pop("upload_picture", None)

        if upload:
            # abre imagem
            img = Image.open(upload)
            img = img.convert("RGB")

            # resize (mantém proporção)
            img.thumbnail((512, 512))

            # buffer em memória
            buffer = BytesIO()
            img.save(buffer, format="JPEG", quality=85)
            buffer.seek(0)

            # nome com hash
            filename = f"{uuid.uuid4().hex}.jpg"

            # remove foto antiga
            if instance.profile_picture:
                instance.profile_picture.delete(save=False)

            # salva nova
            instance.profile_picture.save(
                filename,
                ContentFile(buffer.read()),
                save=False,
            )

        return super().update(instance, validated_data)
