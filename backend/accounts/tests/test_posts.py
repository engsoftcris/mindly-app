import pytest
from io import BytesIO
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from accounts.models import Post


def make_test_png(name="integration_test.png"):
    buf = BytesIO()
    img = Image.new("RGB", (10, 10), "white")
    img.save(buf, format="PNG")
    buf.seek(0)
    return SimpleUploadedFile(
        name=name,
        content=buf.read(),
        content_type="image/png",
    )


@pytest.mark.django_db
class TestPostIntegration:
    def test_create_post_with_image_and_text(self, auth_client):
        url = "/api/posts/"

        image = make_test_png()

        data = {
            "content": "Teste de integração: Imagem + Texto",
            "media": image,
        }

        response = auth_client.post(url, data, format="multipart")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["moderation_status"] == "PENDING"
        assert Post.objects.count() == 1

        post = Post.objects.first()
        assert post.media.name.startswith("posts/")

        # Confirma que o storage está gerando URL do Supabase (não depende do serializer)
        media_url = post.media.url
        assert "supabase.co/storage/v1/object/public" in media_url
