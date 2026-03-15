"""Testes para o sistema de follow, unfollow e regras de cooldown."""

from datetime import timedelta
from unittest.mock import patch
import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from accounts.models import User, Profile, Follow


@pytest.mark.django_db
class TestFollowSystem:
    """Valida o comportamento de seguir/parar de seguir usuários."""

    @pytest.fixture
    def setup_data(self):
        """Prepara usuários e perfis para os testes de follow."""
        me = User.objects.create_user(username="me", email="me@test.com")
        other = User.objects.create_user(username="other", email="other@test.com")

        Profile.objects.get_or_create(user=me)
        profile_other, _ = Profile.objects.get_or_create(user=other)

        return me, other, profile_other

    def test_follow_user_success(self, api_client, setup_data):
        """Valida se um usuário consegue seguir outro com sucesso."""
        me, other, profile_other = setup_data
        api_client.force_authenticate(user=me)

        url = reverse("profile-follow-toggle", kwargs={"pk": profile_other.pk})
        response = api_client.post(url)

        assert response.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        assert response.data["is_following"] is True
        assert me.following.filter(id=other.id).exists()

    def test_cannot_follow_self(self, api_client, setup_data):
        """Garante que um usuário não consiga seguir a si próprio."""
        me, _, _ = setup_data  # Limpeza: other e profile_other removidos
        profile_me = me.profile
        api_client.force_authenticate(user=me)

        url = reverse("profile-follow-toggle", kwargs={"pk": profile_me.pk})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "You cannot follow yourself" in response.data["error"]

    def test_unfollow_user_success(self, api_client, setup_data):
        """Valida o processo de deixar de seguir (Soft Unfollow)."""
        me, other, profile_other = setup_data
        Follow.objects.create(follower=me, following=other)
        api_client.force_authenticate(user=me)

        url = reverse("profile-follow-toggle", kwargs={"pk": profile_other.pk})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_following"] is False
        assert not me.active_following.filter(id=other.id).exists()

        follow = Follow.all_objects.filter(follower=me, following=other).first()
        assert follow is not None
        assert follow.unfollowed_at is not None

    def test_follow_cooldown_5_minutes(self, api_client, setup_data):
        """Testa a regra de negócio de esperar 5 min para seguir novamente."""
        me, _, profile_other = setup_data  # Limpeza: other removido
        api_client.force_authenticate(user=me)

        url = reverse("profile-follow-toggle", kwargs={"pk": profile_other.pk})

        api_client.post(url)  # 1. Follow
        api_client.post(url)  # 2. Unfollow

        # 3. Tentar seguir de novo imediatamente
        response3 = api_client.post(url)
        assert response3.status_code == status.HTTP_400_BAD_REQUEST
        assert "Wait" in response3.data["error"]
        assert response3.data["cooldown"] is True

    def test_follow_cooldown_expires(self, api_client, setup_data):
        """Valida que o cooldown expira após o tempo configurado."""
        me, _, profile_other = setup_data  # Limpeza: other removido
        api_client.force_authenticate(user=me)

        url = reverse("profile-follow-toggle", kwargs={"pk": profile_other.pk})

        api_client.post(url)  # Follow
        api_client.post(url)  # Unfollow

        future_time = timezone.now() + timedelta(minutes=6)

        with patch("accounts.views.now", return_value=future_time), patch(
            "accounts.models.now", return_value=future_time
        ):

            response3 = api_client.post(url)
            assert response3.status_code == status.HTTP_200_OK
            assert response3.data["is_following"] is True
