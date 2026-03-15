"""Testes para o sistema de comentários, incluindo suporte a GIFs e imagens."""

import io
import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from accounts.models import Post, Comment

# pylint: disable=redefined-outer-name


@pytest.mark.django_db
class TestComments:
    """Testes de criação e visualização de comentários."""

    def test_create_comment_authenticated(self, api_client, user, post):
        """Testa se um user logado pode comentar num post."""
        api_client.force_authenticate(user=user)
        url = reverse("comment-list")
        data = {
            "post": post.id,
            "content": "Este é um comentário de teste! 🚀",
            "is_gif": False,
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert Comment.objects.count() == 1

        # CORREÇÃO MYPY: Garantir que o comentário existe
        first_comment = Comment.objects.first()
        assert first_comment is not None
        assert first_comment.content == data["content"]

    def test_post_serializer_count_updates(self, api_client, user, post):
        """Valida se o comments_count no PostSerializer reflete a realidade."""
        Comment.objects.create(post=post, author=user, content="Comentário 1")
        Comment.objects.create(post=post, author=user, content="Comentário 2")

        api_client.force_authenticate(user=user)
        url = reverse("post-detail", kwargs={"pk": post.pk})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["comments_count"] == 2

    def test_comment_author_is_automatic(self, api_client, user, post):
        """Garante que o author do comentário é sempre o user logado."""
        api_client.force_authenticate(user=user)
        url = reverse("comment-list")
        data = {"post": post.id, "content": "Teste de autor"}

        response = api_client.post(url, data)
        assert response.data["author"] == user.id

    def test_create_comment_with_gif(self, api_client, user, post):
        """Testa se um user pode postar um comentário contendo um GIF."""
        api_client.force_authenticate(user=user)
        url = reverse("comment-list")

        gif_url = "https://media.giphy.com/media/v1.Y2lkPT.../giphy.gif"
        data = {
            "post": post.id,
            "content": "Check out this cool GIF!",
            "media_url": gif_url,
            "is_gif": True,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

        # CORREÇÃO MYPY: Garantir que o comentário existe
        first_comment = Comment.objects.first()
        assert first_comment is not None
        assert first_comment.media_url == gif_url

    def test_create_comment_only_gif(self, api_client, user, post):
        """Testa se é permitido postar APENAS o GIF (sem texto)."""
        api_client.force_authenticate(user=user)
        url = reverse("comment-list")

        data = {
            "post": post.id,
            "content": "",
            "media_url": "https://media.giphy.com/gif-link.gif",
            "is_gif": True,
        }

        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED

    def test_comment_serializer_returns_media_fields(self, api_client, user, post):
        """Valida se o GET do comentário retorna os campos de GIF."""
        Comment.objects.create(
            post=post,
            author=user,
            content="Gif test",
            media_url="https://link.com",
            is_gif=True,
        )

        api_client.force_authenticate(user=user)
        url = reverse("comment-list")
        response = api_client.get(f"{url}?post_id={post.id}")

        assert response.status_code == status.HTTP_200_OK

        # CORREÇÃO MYPY: Garantir que data é uma lista
        data = response.data
        assert isinstance(data, list)
        assert data[0]["is_gif"] is True

    def test_create_comment_with_real_image(self, api_client, user, post):
        """Testa o upload de uma imagem real do PC para o comentário."""
        api_client.force_authenticate(user=user)
        url = reverse("comment-list")

        file = io.BytesIO()
        image = Image.new("RGBA", size=(100, 100), color=(155, 0, 0))
        image.save(file, "png")
        file.seek(0)

        thumbnail = SimpleUploadedFile(
            "test_image.png", file.read(), content_type="image/png"
        )

        data = {
            "post": post.id,
            "content": "Comentário com foto do PC",
            "image": thumbnail,
            "is_gif": False,
        }

        response = api_client.post(url, data, format="multipart")
        assert response.status_code == status.HTTP_201_CREATED

        # Proteção contra None no campo de imagem da response
        image_field = response.data.get("image")
        assert image_field is not None
        assert "test_image" in image_field


@pytest.mark.django_db
class TestCommentsCRUD:
    """Testes de atualização e remoção de comentários."""

    def test_retrieve_comment_detail(self, api_client, user, post):
        """GET /comments/{id}/ retorna o comentário."""
        comment = Comment.objects.create(post=post, author=user, content="Detalhe")
        api_client.force_authenticate(user=user)

        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["author"] == user.id

    def test_update_comment_put_only_author(self, api_client, user, post):
        """PUT: só o autor do comentário pode atualizar."""
        comment = Comment.objects.create(post=post, author=user, content="Original")
        api_client.force_authenticate(user=user)

        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        payload = {"post": post.id, "content": "Atualizado", "is_gif": False}
        response = api_client.put(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK

    def test_partial_update_comment_patch_only_author(self, api_client, user, post):
        """PATCH: só o autor do comentário pode atualizar parcialmente."""
        comment = Comment.objects.create(post=post, author=user, content="Original")
        api_client.force_authenticate(user=user)

        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        response = api_client.patch(url, {"content": "Patch"}, format="json")

        assert response.status_code == status.HTTP_200_OK

    def test_update_comment_forbidden_for_non_author(
        self, api_client, user, post, django_user_model
    ):
        """Mesmo o dono do post NÃO pode editar comentário de terceiros."""
        other = django_user_model.objects.create_user(
            username="other", email="other@test.com", password="pass123"
        )
        comment = Comment.objects.create(post=post, author=other, content="Do outro")

        api_client.force_authenticate(user=user)
        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        response = api_client.patch(url, {"content": "Tentativa"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_comment_allowed_for_comment_author(
        self, api_client, user, django_user_model
    ):
        """DELETE: autor do comentário pode apagar."""
        post_owner = django_user_model.objects.create_user(
            username="po", email="po@t.com"
        )
        post = Post.objects.create(user=post_owner, content="Post")
        comment = Comment.objects.create(post=post, author=user, content="Meu")

        api_client.force_authenticate(user=user)
        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        response = api_client.delete(url)

        assert response.status_code in (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK)

    def test_delete_comment_allowed_for_post_owner(
        self, api_client, user, post, django_user_model
    ):
        """DELETE: dono do post pode apagar comentário de terceiros."""
        other = django_user_model.objects.create_user(username="ca", email="ca@t.com")
        comment = Comment.objects.create(post=post, author=other, content="Outro")

        api_client.force_authenticate(user=user)
        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        response = api_client.delete(url)

        assert response.status_code in (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK)

    def test_delete_comment_forbidden_for_stranger(
        self, api_client, user, django_user_model
    ):
        """DELETE: se não for autor nem dono do post → 403."""
        po = django_user_model.objects.create_user(username="po2", email="po2@t.com")
        ca = django_user_model.objects.create_user(username="ca2", email="ca2@t.com")
        post = Post.objects.create(user=po, content="Post")
        comment = Comment.objects.create(post=post, author=ca, content="Comentário")

        api_client.force_authenticate(user=user)
        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_comments_filters_by_post_id(
        self, api_client, user, post, django_user_model
    ):
        """Garante que ?post_id= filtra corretamente."""
        api_client.force_authenticate(user=user)
        other_post = Post.objects.create(
            user=django_user_model.objects.create_user(username="y", email="y@t.com"),
            content="Outro",
        )

        c1 = Comment.objects.create(post=post, author=user, content="A")
        Comment.objects.create(post=other_post, author=user, content="B")

        url = reverse("comment-list")
        response = api_client.get(f"{url}?post_id={post.id}")

        assert response.status_code == status.HTTP_200_OK

        # CORREÇÃO MYPY: Garantir que data é uma lista
        data = response.data
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == c1.id

    def test_create_comment_empty_validation(self, api_client, user, post):
        """Valida falha ao tentar criar comentário vazio sem mídia."""
        api_client.force_authenticate(user=user)
        url = reverse("comment-list")

        data = {"post": post.id, "content": "", "is_gif": False}
        response = api_client.post(url, data, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_cannot_clear_content_illegally(self, api_client, user, post):
        """PATCH: não pode limpar o texto de um comentário que não tem mídia."""
        api_client.force_authenticate(user=user)
        comment = Comment.objects.create(post=post, author=user, content="Texto")

        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        response = api_client.patch(url, {"content": ""}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
