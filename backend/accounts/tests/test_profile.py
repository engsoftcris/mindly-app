import pytest
import uuid
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model # Forma correta de pegar o User customizado


# Define o User no escopo global do arquivo de teste
User = get_user_model()

@pytest.mark.django_db
class TestUserProfile:
    
    def test_profile_auto_created_with_uuid(self, api_client):
        # Agora o 'User' é reconhecido globalmente aqui
        user = User.objects.create_user(username="testuuid", email="uuid@test.com", password="123")
        
        assert hasattr(user, 'profile')
        assert isinstance(user.profile.id, uuid.UUID)

    def test_get_my_profile(self, api_client):
        user = User.objects.create_user(username="profile_getter", email="get@test.com")
        api_client.force_authenticate(user=user)
        
        url = reverse('my-profile')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == "profile_getter"
        assert 'display_name' in response.data

    def test_update_profile_bio_and_name(self, api_client):
        user = User.objects.create_user(username="editor", email="edit@test.com")
        api_client.force_authenticate(user=user)
        
        url = reverse('my-profile')
        payload = {
            "display_name": "Cristiano Dev",
            "bio": "Building Mindly 2026"
        }
        
        response = api_client.patch(url, payload)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['display_name'] == "Cristiano Dev"
        assert response.data['bio'] == "Building Mindly 2026"
        
        user.profile.refresh_from_db()
        assert user.profile.display_name == "Cristiano Dev"

    def test_cannot_access_others_profile_via_me_endpoint(self, api_client):
        user_a = User.objects.create_user(username="user_a", email="a@test.com")
        user_b = User.objects.create_user(username="user_b", email="b@test.com")
        
        api_client.force_authenticate(user=user_a)
        url = reverse('my-profile')
        response = api_client.get(url)
        
        assert response.data['username'] == "user_a"
        assert response.data['username'] != "user_b"