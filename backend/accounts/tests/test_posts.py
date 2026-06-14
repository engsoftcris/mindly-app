"""Testes de integração para posts, incluindo ciclo de vida, imagens e soft delete."""

from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status

from accounts.models import Comment, Post

User = get_user_model()

# pylint: disable=redefined-outer-name


def make_test_png(name="integration_test.png"):
    """Gera uma imagem PNG válida em memória para testes de upload."""
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
    """Valida a criação, edição e remoção (soft delete) de postagens."""

    def test_create_post_with_image_and_text(self, auth_client):
        """Testa criação de post com mídia e valida integração com storage."""
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

        # CORREÇÃO MYPY: Garantir que o post existe e tem mídia
        first_post = Post.objects.first()
        assert first_post is not None
        assert first_post.media is not None
        assert "supabase.co" in first_post.media.url

    def test_soft_delete_lifecycle(self, auth_client, user):
        """TAL-38: Valida que o post é escondido (is_deleted) mas mantido no banco."""
        post = Post.objects.create(user=user, content="Post para ser apagado")
        url = f"/api/posts/{post.id}/"

        response = auth_client.delete(url)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert Post.objects.filter(id=post.id).count() == 0
        assert Post.all_objects.filter(id=post.id).exists()

    def test_unauthorized_soft_delete(self, auth_client, user):
        """TAL-38: Garante que um usuário não pode apagar post alheio (W0613 fix)."""
        _ = user
        outro_user = User.objects.create_user(
            username="hacker", email="hacker@test.com", password="password123"
        )
        post_alheio = Post.objects.create(user=outro_user, content="Post alheio")

        url = f"/api/posts/{post_alheio.id}/"
        response = auth_client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert not post_alheio.is_deleted

    def test_hard_delete_behavior(self, user):
        """TAL-38: Valida que force=True remove permanentemente o registro."""
        post = Post.objects.create(user=user, content="Remoção permanente")
        post_id = post.id
        post.delete(force=True)
        assert not Post.all_objects.filter(id=post_id).exists()

    def test_post_update_autonomy_tal_48(self, auth_client, user):
        """TAL-48: Testa edição pelo dono e reset automático da moderação."""
        post = Post.objects.create(user=user, content="Conteúdo Antigo")
        url = f"/api/posts/{post.id}/"
        response = auth_client.patch(url, {"content": "Conteúdo Editado"})

        assert response.status_code == 200
        post.refresh_from_db()
        assert post.moderation_status == "PENDING"

    def test_profile_picture_upload_settings_tal_48(self, auth_client, user):
        """TAL-48: Testa upload de foto de perfil via endpoint de settings."""
        url = "/api/accounts/profile/picture/"
        image = make_test_png("new_avatar.png")
        response = auth_client.put(url, {"profile_picture": image}, format="multipart")

        assert response.status_code == 200
        user.refresh_from_db()
        # CORREÇÃO AQUI: O campo image_status pertence ao Profile, não ao User
        assert user.profile.image_status == "PENDING"

    def test_comment_delete_autonomy_tal_48(self, auth_client, user):
        """TAL-48: Testa se o dono pode apagar seu próprio comentário."""
        post = Post.objects.create(user=user, content="Post")
        comment = Comment.objects.create(post=post, author=user, content="Comentário")

        url = f"/api/comments/{comment.id}/"
        response = auth_client.delete(url)
        assert response.status_code == 204

    def test_create_post_empty_should_fail(self, api_client, user):
        """Valida falha ao criar post sem conteúdo."""
        api_client.force_authenticate(user=user)
        url = reverse("post-list")
        resp = api_client.post(url, {"content": ""}, format="multipart")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_cannot_turn_post_into_empty(self, api_client, user, post):
        """Impede que edição remova todo o conteúdo do post."""
        api_client.force_authenticate(user=user)
        url = reverse("post-detail", kwargs={"pk": post.pk})
        resp = api_client.patch(url, {"content": ""}, format="multipart")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_post_with_json_should_return_415(self, api_client, user):
        """Garante que o endpoint exija MultiPart (necessário para imagens)."""
        api_client.force_authenticate(user=user)
        url = reverse("post-list")
        response = api_client.post(url, {"content": "Post via JSON"}, format="json")
        assert response.status_code == status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
