import pytest
from rest_framework import status
from django.urls import reverse
from accounts.models import Post, Comment

@pytest.mark.django_db
class TestComments:
    def test_create_comment_authenticated(self, api_client, user, post):
        """Testa se um user logado pode comentar num post"""
        api_client.force_authenticate(user=user)
        url = reverse('comment-list') # Rota do ViewSet
        data = {
            "post": post.id,
            "content": "Este é um comentário de teste! 🚀",
            "is_gif": False
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Comment.objects.count() == 1
        assert Comment.objects.first().content == data["content"]

    def test_post_serializer_count_updates(self, api_client, user, post):
        """Valida se o comments_count no PostSerializer reflete a realidade"""
        # Criar 2 comentários
        Comment.objects.create(post=post, author=user, content="Comentário 1")
        Comment.objects.create(post=post, author=user, content="Comentário 2")
        
        api_client.force_authenticate(user=user)
        url = reverse('post-detail', kwargs={'pk': post.pk})
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['comments_count'] == 2

    def test_comment_author_is_automatic(self, api_client, user, post):
        """Garante que o author do comentário é sempre o user logado (perform_create)"""
        api_client.force_authenticate(user=user)
        url = reverse('comment-list')
        data = {"post": post.id, "content": "Teste de autor"}
        
        response = api_client.post(url, data)
        assert response.data['author'] == user.id
    
    def test_create_comment_with_gif(self, api_client, user, post):
        """Testa se um user pode postar um comentário contendo um GIF"""
        api_client.force_authenticate(user=user)
        url = reverse('comment-list')
        
        gif_url = "https://media.giphy.com/media/v1.Y2lkPT.../giphy.gif"
        data = {
            "post": post.id,
            "content": "Check out this cool GIF!",
            "media_url": gif_url,
            "is_gif": True
        }
        
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Comment.objects.count() == 1
        
        saved_comment = Comment.objects.first()
        assert saved_comment.media_url == gif_url
        assert saved_comment.is_gif is True
        assert saved_comment.content == data["content"]

    def test_create_comment_only_gif(self, api_client, user, post):
        """Testa se é permitido postar APENAS o GIF (sem texto)"""
        api_client.force_authenticate(user=user)
        url = reverse('comment-list')
        
        data = {
            "post": post.id,
            "content": "", # Content can be empty now
            "media_url": "https://media.giphy.com/gif-link.gif",
            "is_gif": True
        }
        
        response = api_client.post(url, data)
        
        # Se você definiu blank=True, null=True no model, isso deve passar:
        assert response.status_code == status.HTTP_201_CREATED
        assert Comment.objects.first().media_url == data["media_url"]

    def test_comment_serializer_returns_media_fields(self, api_client, user, post):
        """Valida se o GET do comentário retorna os campos de GIF"""
        Comment.objects.create(
            post=post, 
            author=user, 
            content="Gif test", 
            media_url="https://link.com", 
            is_gif=True
        )
        
        api_client.force_authenticate(user=user)
        url = reverse('comment-list')
        response = api_client.get(f"{url}?post_id={post.id}")
        
        assert response.status_code == status.HTTP_200_OK
        first_comment = response.data[0]
        assert 'media_url' in first_comment
        assert 'is_gif' in first_comment
        assert first_comment['is_gif'] is True
    def test_create_comment_with_real_image(self, api_client, user, post):
        """Testa o upload de uma imagem real do PC para o comentário"""
        api_client.force_authenticate(user=user)
        url = reverse('comment-list')
        
        # Criamos um arquivo de imagem fake em memória
        import io
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile

        file = io.BytesIO()
        image = Image.new('RGBA', size=(100, 100), color=(155, 0, 0))
        image.save(file, 'png')
        file.seek(0)
        
        thumbnail = SimpleUploadedFile(
            "test_image.png", 
            file.read(), 
            content_type="image/png"
        )

        data = {
            "post": post.id,
            "content": "Comentário com foto do PC",
            "image": thumbnail, # Enviando o arquivo
            "is_gif": False
        }
        
        # multipart/form-data é necessário para envio de arquivos
        response = api_client.post(url, data, format='multipart')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'image' in response.data
        assert response.data['image'] is not None
        assert "test_image" in response.data['image']
        
        # Valida se salvou no banco
        saved_comment = Comment.objects.get(id=response.data['id'])
        assert saved_comment.image.name.endswith('.png')


@pytest.mark.django_db
class TestCommentsCRUD:
    def test_retrieve_comment_detail(self, api_client, user, post):
        """GET /comments/{id}/ retorna o comentário"""
        comment = Comment.objects.create(post=post, author=user, content="Detalhe")
        api_client.force_authenticate(user=user)

        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == comment.id
        assert response.data["content"] == "Detalhe"
        # seu serializer expõe 'author' (read-only) e 'author_id'
        assert response.data["author"] == user.id

    def test_update_comment_put_only_author(self, api_client, user, post):
        """PUT: só o autor do comentário pode atualizar"""
        comment = Comment.objects.create(post=post, author=user, content="Original")
        api_client.force_authenticate(user=user)

        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        payload = {
            "post": post.id,
            "content": "Atualizado via PUT",
            "is_gif": False,
        }
        response = api_client.put(url, payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        comment.refresh_from_db()
        assert comment.content == "Atualizado via PUT"

    def test_partial_update_comment_patch_only_author(self, api_client, user, post):
        """PATCH: só o autor do comentário pode atualizar parcialmente"""
        comment = Comment.objects.create(post=post, author=user, content="Original")
        api_client.force_authenticate(user=user)

        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        response = api_client.patch(url, {"content": "Atualizado via PATCH"}, format="json")

        assert response.status_code == status.HTTP_200_OK
        comment.refresh_from_db()
        assert comment.content == "Atualizado via PATCH"

    def test_update_comment_forbidden_for_non_author_even_if_post_owner(
        self, api_client, user, post, django_user_model
    ):
        """
        REGRA DO SEU CÓDIGO:
        - Editar: só autor do comentário.
        Mesmo o dono do post NÃO pode editar comentário de terceiros.
        """
        other = django_user_model.objects.create_user(
            username="other_author", email="other_author@test.com", password="pass123"
        )
        comment = Comment.objects.create(post=post, author=other, content="Do outro")

        api_client.force_authenticate(user=user)  # user é dono do post (fixture post)
        url = reverse("comment-detail", kwargs={"pk": comment.pk})

        response = api_client.patch(url, {"content": "Tentativa"}, format="json")

        assert response.status_code == status.HTTP_403_FORBIDDEN
        comment.refresh_from_db()
        assert comment.content == "Do outro"

    def test_delete_comment_allowed_for_comment_author(self, api_client, user, django_user_model):
        """DELETE: autor do comentário pode apagar mesmo que não seja dono do post"""
        post_owner = django_user_model.objects.create_user(
            username="post_owner", email="post_owner@test.com", password="pass123"
        )
        post = Post.objects.create(user=post_owner, content="Post do post_owner")
        comment = Comment.objects.create(post=post, author=user, content="Meu comentário")

        api_client.force_authenticate(user=user)
        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        response = api_client.delete(url)

        assert response.status_code in (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK)
        assert not Comment.objects.filter(id=comment.id).exists()

    def test_delete_comment_allowed_for_post_owner(self, api_client, user, post, django_user_model):
        """DELETE: dono do post pode apagar comentário de terceiros"""
        other = django_user_model.objects.create_user(
            username="comment_author", email="comment_author@test.com", password="pass123"
        )
        comment = Comment.objects.create(post=post, author=other, content="Comentário do outro")

        api_client.force_authenticate(user=user)  # user é dono do post (fixture post)
        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        response = api_client.delete(url)

        assert response.status_code in (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK)
        assert not Comment.objects.filter(id=comment.id).exists()

    def test_delete_comment_forbidden_for_non_author_and_non_post_owner(
        self, api_client, user, django_user_model
    ):
        """DELETE: se não for autor nem dono do post → 403"""
        post_owner = django_user_model.objects.create_user(
            username="post_owner2", email="post_owner2@test.com", password="pass123"
        )
        comment_author = django_user_model.objects.create_user(
            username="comment_author2", email="comment_author2@test.com", password="pass123"
        )

        post = Post.objects.create(user=post_owner, content="Post do post_owner2")
        comment = Comment.objects.create(post=post, author=comment_author, content="Comentário")

        api_client.force_authenticate(user=user)  # user aleatório
        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        response = api_client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Comment.objects.filter(id=comment.id).exists()

    def test_list_comments_filters_by_post_id(self, api_client, user, post, django_user_model):
        api_client.force_authenticate(user=user)

        other_owner = django_user_model.objects.create_user(
            username="x", email="x@test.com", password="pass123"
        )
        other_post = Post.objects.create(user=other_owner, content="Outro post")

        c1 = Comment.objects.create(post=post, author=user, content="Do post A")
        Comment.objects.create(post=other_post, author=user, content="Do post B")

        url = reverse("comment-list")
        response = api_client.get(f"{url}?post_id={post.id}")

        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data]
        assert c1.id in ids
        assert all(item["post"] == post.id for item in response.data)
    
    def test_list_comments_filters_by_post_id(self, api_client, user, post, django_user_model):
        """
        Garante que ?post_id= filtra corretamente
        e não retorna comentários de outros posts.
        """
        api_client.force_authenticate(user=user)

        # Outro post de outro usuário
        other_owner = django_user_model.objects.create_user(
            username="other_user",
            email="other_user@test.com",
            password="pass123"
        )
        other_post = Post.objects.create(user=other_owner, content="Outro post")

        # Comentários em posts diferentes
        c1 = Comment.objects.create(post=post, author=user, content="Comentário A")
        Comment.objects.create(post=other_post, author=user, content="Comentário B")

        url = reverse("comment-list")
        response = api_client.get(f"{url}?post_id={post.id}")

        assert response.status_code == status.HTTP_200_OK
        returned_ids = [item["id"] for item in response.data]

        # Deve conter apenas comentário do post filtrado
        assert c1.id in returned_ids
        assert all(item["post"] == post.id for item in response.data)

    def test_delete_returns_403_and_not_500_when_forbidden(self, api_client, user, django_user_model):
        post_owner = django_user_model.objects.create_user(
            username="post_owner_x",
            email="post_owner_x@test.com",
            password="pass123"
        )
        comment_author = django_user_model.objects.create_user(
            username="comment_author_x",
            email="comment_author_x@test.com",
            password="pass123"
        )

        post = Post.objects.create(user=post_owner, content="Post X")
        comment = Comment.objects.create(post=post, author=comment_author, content="Comentário X")

        api_client.force_authenticate(user=user)
        url = reverse("comment-detail", kwargs={"pk": comment.pk})

        response = api_client.delete(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert Comment.objects.filter(id=comment.id).exists()
    
    def test_create_comment_empty_without_media_should_fail(self, api_client, user, post):
        api_client.force_authenticate(user=user)
        url = reverse("comment-list")

        data = {"post": post.id, "content": "", "is_gif": False}
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST


    def test_create_comment_gif_true_without_media_url_should_fail(self, api_client, user, post):
        api_client.force_authenticate(user=user)
        url = reverse("comment-list")

        data = {"post": post.id, "content": "", "is_gif": True}
        response = api_client.post(url, data, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_patch_cannot_turn_text_only_comment_into_empty(self, api_client, user, post):
        api_client.force_authenticate(user=user)
        comment = Comment.objects.create(post=post, author=user, content="Texto inicial")

        url = reverse("comment-detail", kwargs={"pk": comment.pk})
        response = api_client.patch(url, {"content": ""}, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        comment.refresh_from_db()
        assert comment.content == "Texto inicial"
        