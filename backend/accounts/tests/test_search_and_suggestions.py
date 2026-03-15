"""Testes para o motor de busca de usuários e sistema de sugestões de follow."""

import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import Profile

User = get_user_model()

# pylint: disable=redefined-outer-name, unused-argument

# --- FIXTURES ---


@pytest.fixture
def api_client():
    """Cria um cliente para fazer requisições à API."""
    return APIClient()


@pytest.fixture
def setup_users(db):
    """Cria o cenário de teste com utilizadores, perfis e um admin."""
    me = User.objects.create_user(
        username="cristiano", email="cristiano@mindly.com", password="password123"
    )
    Profile.objects.get_or_create(user=me)

    juliet = User.objects.create_user(
        username="juliet",
        full_name="Juliet Bennett",
        email="juliet@gmail.com",
        password="password123",
    )
    Profile.objects.get_or_create(user=juliet)

    admin = User.objects.create_superuser(
        username="admin", email="admin@mindly.com", password="password123"
    )
    Profile.objects.get_or_create(user=admin)

    return me, juliet, admin


# --- TESTES ---


@pytest.mark.django_db
class TestSearchAndSuggestions:
    """Valida as regras de visibilidade na busca e sugestões."""

    def test_suggestions_logic(self, api_client, setup_users):
        """TAL-20: Garante que as sugestões ignoram o admin e o próprio utilizador."""
        me, _, _ = setup_users  # '_' ignora variáveis não usadas (W0612 fix)
        api_client.force_authenticate(user=me)

        url = reverse("suggested-follows")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        usernames = []
        for item in response.data:
            if "user" in item and isinstance(item["user"], dict):
                usernames.append(item["user"].get("username"))
            else:
                usernames.append(item.get("username"))

        assert "juliet" in usernames
        assert "admin" not in usernames
        assert "cristiano" not in usernames

    def test_search_finds_juliet(self, api_client, setup_users):
        """TAL-20: Testa se a busca por termo parcial encontra o alvo correto."""
        me, _, _ = setup_users
        api_client.force_authenticate(user=me)

        url = reverse("user-search") + "?q=juliet"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) > 0

        primeiro = response.data[0]
        username = (
            primeiro["user"].get("username")
            if "user" in primeiro
            else primeiro.get("username")
        )
        assert username == "juliet"

    def test_search_security_admin_filter(self, api_client, setup_users):
        """TAL-20: Garante que contas administrativas são ocultadas da busca pública."""
        me, _, _ = setup_users
        api_client.force_authenticate(user=me)

        url = reverse("user-search") + "?q=admin"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0
