import pytest
from rest_framework import status
from accounts.models import Like 

@pytest.mark.django_db
class TestLikes:
    def test_like_post_authenticated(self, auth_client, post):
        url = f"/api/posts/{post.pk}/like/"
        response = auth_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_liked'] is True
        assert response.data['likes_count'] == 1
        
        # Verificação extra: O like existe E pertence ao usuário correto?
        like = Like.objects.get(post=post)
        # O auth_client usa o user da fixture, podemos validar se o ID bate
        assert like.user.username == "testuser" 

    def test_unlike_post(self, auth_client, post):
        url = f"/api/posts/{post.pk}/like/"
        auth_client.post(url)  # Ativar Like
        response = auth_client.post(url)  # Desativar Like (Toggle)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_liked'] is False
        assert response.data['likes_count'] == 0
        assert Like.objects.filter(post=post).count() == 0

    def test_multiple_likes_integrity(self, auth_client, post):
        """Garante que múltiplos cliques resultam no estado correto (Toggle)"""
        url = f"/api/posts/{post.pk}/like/"
        
        # Garantia inicial
        assert Like.objects.filter(post=post).count() == 0
        
        auth_client.post(url) # 1º clique -> Like
        auth_client.post(url) # 2º clique -> Unlike
        auth_client.post(url) # 3º clique -> Like novamente
        
        assert Like.objects.filter(post=post).count() == 1
        assert post.likes.count() == 1