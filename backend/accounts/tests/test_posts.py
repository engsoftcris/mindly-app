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
    def test_soft_delete_lifecycle(self, auth_client, user):
        """TAL-38: Valida que o post é escondido mas não removido do banco."""
        # 1. Cria o post
        post = Post.objects.create(user=user, content="Post para ser apagado")
        url = f"/api/posts/{post.id}/"

        # 2. Faz o DELETE via API
        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # 3. Verifica se sumiu da listagem normal (Manager padrão)
        assert Post.objects.filter(id=post.id).count() == 0

        # 4. Verifica se AINDA EXISTE no banco de verdade (Manager de auditoria)
        assert Post.all_objects.filter(id=post.id).exists()
        
        # 5. Confirma que a flag está True
        post.refresh_from_db()
        assert post.is_deleted is True

    def test_unauthorized_soft_delete(self, auth_client, user):
        """TAL-38: Garante que um usuário não pode apagar post de outro."""
        from accounts.models import User
        
        # Criamos o outro usuário manualmente já que o factory falhou
        outro_user = User.objects.create_user(
            username="hacker", 
            email="hacker@test.com", 
            password="password123"
        )
        
        post_alheio = Post.objects.create(user=outro_user, content="Post de outra pessoa")
        
        url = f"/api/posts/{post_alheio.id}/"
        
        # Tenta apagar com o usuário logado (auth_client) que NÃO é o dono
        response = auth_client.delete(url)
        
        # Deve retornar 403 Forbidden
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # O post deve continuar intacto
        post_alheio.refresh_from_db()
        assert post_alheio.is_deleted is False

    def test_hard_delete_behavior(self, user):
        """TAL-38: Valida que o método delete(force=True) funciona para o Admin."""
        post = Post.objects.create(user=user, content="Remoção permanente")
        post_id = post.id
        
        # Simula a ação do Admin usando force=True
        post.delete(force=True)
        
        assert Post.all_objects.filter(id=post_id).exists() is False