import pytest
from django.urls import reverse
from rest_framework import status
from accounts.models import User, Profile, Follow
from unittest.mock import patch
from django.utils import timezone
from datetime import timedelta

@pytest.mark.django_db
class TestFollowSystem:

    @pytest.fixture
    def setup_data(self):
        # Criar utilizadores
        me = User.objects.create_user(username="me", email="me@test.com")
        other = User.objects.create_user(username="other", email="other@test.com")
        
        # Garantir que os perfis existem (o sinal do Django costuma criar, mas garantimos aqui)
        profile_me, _ = Profile.objects.get_or_create(user=me)
        profile_other, _ = Profile.objects.get_or_create(user=other)
        
        return me, other, profile_other

    def test_follow_user_success(self, api_client, setup_data):
        me, other, profile_other = setup_data
        api_client.force_authenticate(user=me)
        
        # NOME DA ROTA: profile-follow-toggle (basename 'profile' + nome da função @action)
        url = reverse('profile-follow-toggle', kwargs={'pk': profile_other.pk})
        response = api_client.post(url)
        
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        assert response.data['is_following'] is True
        assert me.following.filter(id=other.id).exists()

    def test_cannot_follow_self(self, api_client, setup_data):
        me, other, profile_other = setup_data
        profile_me = me.profile
        api_client.force_authenticate(user=me)
        
        url = reverse('profile-follow-toggle', kwargs={'pk': profile_me.pk})
        response = api_client.post(url)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "You cannot follow yourself" in response.data['error']

    def test_unfollow_user_success(self, api_client, setup_data):
        me, other, profile_other = setup_data
        # Criar o follow inicial
        Follow.objects.create(follower=me, following=other)
        api_client.force_authenticate(user=me)
        
        url = reverse('profile-follow-toggle', kwargs={'pk': profile_other.pk})
        response = api_client.post(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_following'] is False
        
        # VERIFICAÇÃO CORRETA: Usando active_following
        assert not me.active_following.filter(id=other.id).exists()
    
        # Verifica que o registro ainda existe no banco
        follow = Follow.all_objects.filter(follower=me, following=other).first()
        assert follow is not None
        assert follow.unfollowed_at is not None

    def test_follow_cooldown_5_minutes(self, api_client, setup_data):
        """Testa a regra de negócio de esperar 5 min para seguir novamente"""
        me, other, profile_other = setup_data
        api_client.force_authenticate(user=me)
        
        url = reverse('profile-follow-toggle', kwargs={'pk': profile_other.pk})
        
        # 1. Primeiro follow
        response1 = api_client.post(url)
        assert response1.status_code == status.HTTP_201_CREATED
        assert response1.data['is_following'] is True
        
        # 2. Unfollow
        response2 = api_client.post(url)
        assert response2.status_code == status.HTTP_200_OK
        assert response2.data['is_following'] is False
        
        # 3. Tentar seguir de novo imediatamente (deve dar erro 400)
        response3 = api_client.post(url)
        assert response3.status_code == status.HTTP_400_BAD_REQUEST
        assert "Wait" in response3.data['error']
        assert response3.data['cooldown'] is True
        
        # Opcional: Testar que depois de 5 minutos funciona
        # (isso requer mock do timezone.now)

    def test_follow_cooldown_expires(self, api_client, setup_data):
        me, other, profile_other = setup_data
        api_client.force_authenticate(user=me)
        
        url = reverse('profile-follow-toggle', kwargs={'pk': profile_other.pk})
        
        # Follow
        response1 = api_client.post(url)
        assert response1.status_code in [200, 201]
        
        # Unfollow
        response2 = api_client.post(url)
        assert response2.status_code == 200
        assert response2.data['is_following'] is False
        
        # Avançar o tempo 6 minutos
        future_time = timezone.now() + timedelta(minutes=6)
        
        # Mock em todos os lugares que importam 'now'
        with patch('accounts.views.now', return_value=future_time), \
            patch('accounts.models.now', return_value=future_time):
            
            # Agora deve funcionar
            response3 = api_client.post(url)
            assert response3.status_code == status.HTTP_200_OK
            assert response3.data['is_following'] is True