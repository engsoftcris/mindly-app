import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from accounts.models import Post

User = get_user_model()

@pytest.mark.django_db
class TestProfilePostsFilter:
    
    @pytest.fixture
    def setup_data(self, api_client):
        # 1. Cria usuário seguindo seu padrão de sucesso
        self.user = User.objects.create_user(
            username="tester_filters", 
            email="filter@test.com", 
            password="password123"
        )
        api_client.force_authenticate(user=self.user)
        
        # O profile é criado automaticamente via signal, conforme seus outros testes
        self.profile = self.user.profile
        
        # 2. Cria posts de teste (Diferenciando Texto, Imagem, Vídeo e Rejeitado)
        # Post de Texto Puro
        Post.objects.create(user=self.user, content="Texto puro", media=None)
        
        # Post com Imagem
        Post.objects.create(user=self.user, content="Uma foto", media="image.jpg")
        
        # Post com Vídeo
        Post.objects.create(user=self.user, content="Um video", media="video.mp4")
        
        # Post Rejeitado pela Moderação (Não deve aparecer em filtros de mídia)
        Post.objects.create(
            user=self.user, 
            content="Banido", 
            media="rejeitado.jpg", 
            moderation_status="REJECTED"
        )

        # 3. Define a URL conforme seu router (user-posts-list)
        self.url = reverse('user-posts-list', kwargs={'pk': self.profile.id})
        return api_client

    def test_filter_media_only_true(self, setup_data):
        """TAL-20: Testa se media_only=true remove posts sem arquivo"""
        api_client = setup_data
        response = api_client.get(f"{self.url}?media_only=true")
        
        assert response.status_code == status.HTTP_200_OK
        
        # Deve retornar 2 posts (imagem e vídeo). Ignora texto e rejeitado.
        results = response.data.get('results', response.data)
        assert len(results) == 2
        for post in results:
            assert post['media'] is not None
            assert post['moderation_status'] != "REJECTED"

    def test_filter_by_type_image(self, setup_data):
        """TAL-20: Testa se type=image retorna apenas extensões de imagem"""
        api_client = setup_data
        response = api_client.get(f"{self.url}?media_only=true&type=image")
        
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert ".jpg" in results[0]['media']

    def test_filter_by_type_video(self, setup_data):
        """TAL-20: Testa se type=video retorna apenas extensões de vídeo"""
        api_client = setup_data
        response = api_client.get(f"{self.url}?media_only=true&type=video")
        
        results = response.data.get('results', response.data)
        assert len(results) == 1
        assert ".mp4" in results[0]['media']

    def test_moderation_security(self, setup_data):
        """Garante que posts REJECTED não aparecem nem no feed geral do perfil"""
        api_client = setup_data
        response = api_client.get(self.url)
        
        results = response.data.get('results', response.data)
        # Total deve ser 3 (Texto, Foto, Vídeo). O Rejeitado deve ser filtrado.
        assert len(results) == 3
        for post in results:
            assert post['content'] != "Banido"
            assert post['moderation_status'] != "REJECTED"