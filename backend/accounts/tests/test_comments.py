import pytest
from rest_framework import status
from django.urls import reverse
from accounts.models import Post, Comment

@pytest.mark.django_db
class TestComments:
    def test_health_check_endpoint(self, api_client):
        """Valida se o nosso 'keep-awake' endpoint está vivo"""
        url = reverse('health_check')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()['status'] == 'online'

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