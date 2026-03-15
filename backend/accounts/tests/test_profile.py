import io
import uuid
from PIL import Image

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
class TestUserProfile:
    """Testes para o gerenciamento de perfil e upload de imagens."""

    def test_profile_auto_created_with_uuid(self):
        """Valida se o perfil é criado automaticamente com UUID (W0613 fix)"""
        user = User.objects.create_user(
            username="testuuid", email="uuid@test.com", password="123"
        )
        # CORREÇÃO MYPY: Narrowing do Profile
        profile = user.profile
        assert profile is not None
        assert hasattr(user, "profile")
        assert isinstance(profile.id, uuid.UUID)

    def test_get_my_profile(self, api_client):
        """Valida se o usuário consegue recuperar o próprio perfil."""
        user = User.objects.create_user(username="profile_getter", email="get@test.com")
        api_client.force_authenticate(user=user)

        url = reverse("user-profile")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == "profile_getter"

    def test_update_profile_bio_and_name(self, api_client):
        """Testa a atualização parcial (PATCH) dos campos de perfil."""
        user = User.objects.create_user(username="editor", email="edit@test.com")
        api_client.force_authenticate(user=user)

        url = reverse("user-profile")
        payload = {"display_name": "Cristiano Dev", "bio": "Building Mindly 2026"}

        response = api_client.patch(url, payload)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["display_name"] == "Cristiano Dev"

        # CORREÇÃO MYPY: Garantindo que o profile existe para o refresh
        profile = user.profile
        assert profile is not None
        profile.refresh_from_db()
        assert profile.display_name == "Cristiano Dev"

    def test_cannot_access_others_profile_via_me_endpoint(self, api_client):
        """Garante que o endpoint 'me' sempre retorne o perfil do usuário logado."""
        user_a = User.objects.create_user(username="user_a", email="a@test.com")
        api_client.force_authenticate(user=user_a)

        url = reverse("user-profile")
        response = api_client.get(url)

        assert response.data["username"] == "user_a"

    def test_update_profile_picture_resets_moderation(self, api_client):
        """Verify that a new upload forces the status back to PENDING (C0415 fix)"""
        user = User.objects.create_user(username="photouser", email="photo@test.com")
        api_client.force_authenticate(user=user)

        # CORREÇÃO MYPY: Narrowing do Profile
        profile = user.profile
        assert profile is not None

        profile.image_status = "APPROVED"
        profile.save()

        # Criando imagem em memória
        file = io.BytesIO()
        image = Image.new("RGB", (100, 100))
        image.save(file, "jpeg")
        file.seek(0)
        new_photo = SimpleUploadedFile(
            "new.jpg", file.read(), content_type="image/jpeg"
        )

        url = reverse("user-profile-picture")
        response = api_client.put(
            url, {"profile_picture": new_photo}, format="multipart"
        )

        assert response.status_code in [200, 201, 204]

        profile.refresh_from_db()
        assert profile.image_status == "PENDING"
