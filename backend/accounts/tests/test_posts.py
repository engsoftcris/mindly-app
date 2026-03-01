from django.urls import reverse
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

    def test_post_update_autonomy_tal_48(self, auth_client, user):
        """TAL-48: Testa a edição de um post pelo dono e o reset da moderação."""
        post = Post.objects.create(user=user, content="Conteúdo Antigo")
        url = f"/api/posts/{post.id}/"
        
        data = {"content": "Conteúdo Editado"}
        response = auth_client.patch(url, data)
        
        assert response.status_code == 200
        post.refresh_from_db()
        assert post.content == "Conteúdo Editado"
        assert post.moderation_status == "PENDING"

    def test_profile_picture_upload_settings_tal_48(self, auth_client, user):
        """TAL-48: Testa o upload de foto de perfil nas Settings."""
        # 1. A URL CORRETA que definimos no urls.py
        url = "/api/accounts/profile/picture/" 
        
        image = make_test_png("new_avatar.png")
        
        # 2. O CAMPO CORRETO que a View espera é 'profile_picture'
        data = {"profile_picture": image}
        
        # 3. O MÉTODO CORRETO é PUT (como definimos na UserProfilePictureView)
        response = auth_client.put(url, data, format="multipart")
        
        # Verificações
        assert response.status_code == 200
        user.refresh_from_db()
        
        # Verifica se o status resetou para PENDING
        assert user.image_status == "PENDING"
        # Verifica se a imagem foi salva
        assert user.profile.profile_picture.name is not None

    def test_comment_delete_autonomy_tal_48(self, auth_client, user):
        """TAL-48: Testa se o dono pode apagar seu próprio comentário."""
        from accounts.models import Comment
        post = Post.objects.create(user=user, content="Post do comentário")
        comment = Comment.objects.create(post=post, author=user, content="Meu comentário")
        
        url = f"/api/comments/{comment.id}/"
        response = auth_client.delete(url)
        
        assert response.status_code == 204
        assert Comment.objects.filter(id=comment.id).count() == 0
    
    def test_create_post_empty_should_fail(self, api_client, user):
        api_client.force_authenticate(user=user)
        url = reverse("post-list")

        # multipart porque o endpoint só aceita MultiPart/Form
        resp = api_client.post(url, {"content": ""}, format="multipart")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST


    def test_patch_cannot_turn_post_into_empty(self, api_client, user, post):
        api_client.force_authenticate(user=user)
        url = reverse("post-detail", kwargs={"pk": post.pk})

        resp = api_client.patch(url, {"content": ""}, format="multipart")

        assert resp.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_create_post_with_json_should_return_415(self, api_client, user):
        api_client.force_authenticate(user=user)
        url = reverse("post-list")

        response = api_client.post(url, {"content": "Post via JSON"}, format="json")
        assert response.status_code == status.HTTP_415_UNSUPPORTED_MEDIA_TYPE


    def test_patch_post_with_json_should_return_415(self, api_client, user, post):
        api_client.force_authenticate(user=user)
        url = reverse("post-detail", kwargs={"pk": post.pk})

        response = api_client.patch(url, {"content": "Edit via JSON"}, format="json")
        assert response.status_code == status.HTTP_415_UNSUPPORTED_MEDIA_TYPE