import pytest
from django.urls import reverse
from rest_framework import status
from accounts.models import Follow

@pytest.mark.django_db
class TestSocialConnections:
    
    def test_get_followers_list(self, api_client, user, other_user):
        """Testa se a lista de seguidores é retornada corretamente"""
        # Setup: other_user segue user
        Follow.objects.create(follower=other_user, following=user)
        
        # O perfil que queremos ver os seguidores é o do 'user'
        url = reverse('profile-connections', kwargs={'pk': user.profile.id})
        api_client.force_authenticate(user=user)
        
        response = api_client.get(url, {'type': 'followers'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['username'] == other_user.username
        # Verifica se o Serializer incluiu o que precisamos para o React
        assert 'profile_id' in response.data[0]
        assert 'profile_picture' in response.data[0]

    def test_get_following_list(self, api_client, user, other_user):
        """Testa se a lista de pessoas que o usuário segue é retornada corretamente"""
        # Setup: user segue other_user
        Follow.objects.create(follower=user, following=other_user)
        
        url = reverse('profile-connections', kwargs={'pk': user.profile.id})
        api_client.force_authenticate(user=user)
        
        response = api_client.get(url, {'type': 'following'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['username'] == other_user.username

    def test_connections_empty_list(self, api_client, user):
        """Testa retorno de lista vazia quando não há conexões"""
        url = reverse('profile-connections', kwargs={'pk': user.profile.id})
        api_client.force_authenticate(user=user)
        
        response = api_client.get(url, {'type': 'followers'})
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []