import pytest
import uuid
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
class TestUserProfile:
    
    def test_profile_auto_created_with_uuid(self, api_client):
        user = User.objects.create_user(username="testuuid", email="uuid@test.com", password="123")
        assert hasattr(user, 'profile')
        assert isinstance(user.profile.id, uuid.UUID)

    def test_get_my_profile(self, api_client):
        user = User.objects.create_user(username="profile_getter", email="get@test.com")
        api_client.force_authenticate(user=user)
        
        # CORREÇÃO: 'my-profile' -> 'user-profile'
        url = reverse('user-profile')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == "profile_getter"

    def test_update_profile_bio_and_name(self, api_client):
        user = User.objects.create_user(username="editor", email="edit@test.com")
        api_client.force_authenticate(user=user)
        
        # CORREÇÃO: 'my-profile' -> 'user-profile'
        url = reverse('user-profile')
        payload = {
            "display_name": "Cristiano Dev",
            "bio": "Building Mindly 2026"
        }
        
        response = api_client.patch(url, payload)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['display_name'] == "Cristiano Dev"
        
        user.profile.refresh_from_db()
        assert user.profile.display_name == "Cristiano Dev"

    def test_cannot_access_others_profile_via_me_endpoint(self, api_client):
        user_a = User.objects.create_user(username="user_a", email="a@test.com")
        api_client.force_authenticate(user=user_a)
        
        # CORREÇÃO: 'my-profile' -> 'user-profile'
        url = reverse('user-profile')
        response = api_client.get(url)
        
        assert response.data['username'] == "user_a"
    
    def test_update_profile_picture_resets_moderation(self, api_client):
        """Verify that a new upload forces the status back to PENDING"""
        user = User.objects.create_user(username="photouser", email="photo@test.com")
        api_client.force_authenticate(user=user)
        
        profile = user.profile
        profile.image_status = 'APPROVED'
        profile.save()
        
        # URL da foto de perfil
        url = reverse('user-profile-picture')

        import io
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile

        file = io.BytesIO()
        image = Image.new('RGB', (100, 100))
        image.save(file, 'jpeg')
        file.seek(0)
        new_photo = SimpleUploadedFile("new.jpg", file.read(), content_type="image/jpeg")

        # AJUSTE AQUI: Mude .patch para .put
        url = reverse('user-profile-picture')
        response = api_client.put(url, {"profile_picture": new_photo}, format='multipart')
        
        # Agora o status deve ser 200 (ou 201 conforme sua View)
        assert response.status_code in [200, 201, 204]
        
        user_profile = User.objects.get(username="photouser").profile
        user_profile.refresh_from_db()
        assert user_profile.image_status == 'PENDING'