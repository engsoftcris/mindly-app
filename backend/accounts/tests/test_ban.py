"""Testes para o sistema de banimento, restrições de acesso e ações administrativas."""

from unittest import mock  # Standard library primeiro (C0411 fix)
import pytest
from django.contrib.auth import get_user_model
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory
from django.urls import reverse
from rest_framework import status

from accounts.models import Post
from accounts.admin import CustomUserAdmin

User = get_user_model()

# pylint: disable=redefined-outer-name


@pytest.mark.django_db
def test_banned_user_cannot_login(api_client, user):
    """Garante que usuários banidos recebam 403 e o motivo da suspensão no login."""
    user.is_banned = True
    user.ban_reason = "Spam excessivo"
    user.save()

    url = reverse("token_obtain_pair")
    data = {"username": user.username, "password": "password123"}

    response = api_client.post(url, data)

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.data["detail"] == "Sua conta foi suspensa."
    assert response.data["ban_reason"] == "Spam excessivo"


@pytest.mark.django_db
def test_active_session_is_blocked_after_ban(api_client, user):
    """Garante que uma sessão ativa seja interrompida imediatamente após o banimento."""
    # 1. Login para obter token
    login_url = reverse("token_obtain_pair")
    login_res = api_client.post(
        login_url, {"username": user.username, "password": "password123"}
    )
    token = login_res.data["access"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    # 2. Banimos com um motivo
    user.is_banned = True
    user.ban_reason = "Uso de bots"
    user.save()

    # 3. Tenta aceder a rota protegida
    url = reverse("post-list")
    response = api_client.get(url)

    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.data["ban_reason"] == "Uso de bots"


@pytest.mark.django_db
def test_unbanned_user_regains_access(api_client, user):
    """Garante que remover o banimento restaura o acesso do usuário."""
    user.is_banned = True
    user.save()

    login_url = reverse("token_obtain_pair")
    data = {"username": user.username, "password": "password123"}
    assert api_client.post(login_url, data).status_code == status.HTTP_403_FORBIDDEN

    user.is_banned = False
    user.save()

    response = api_client.post(login_url, data)
    assert response.status_code == status.HTTP_200_OK
    assert "access" in response.data


@pytest.mark.django_db
def test_banned_user_posts_disappear_from_feed(api_client, user):
    """Garante que posts de usuários banidos fiquem invisíveis no feed global."""
    other_user = User.objects.create_user(
        username="observador",
        password="password123",
        email="obs@teste.com",
        full_name="Observador de Teste",
    )
    api_client.force_authenticate(user=other_user)

    Post.objects.create(user=user, content="Post do futuro banido")

    feed_url = reverse("post-list")
    response = api_client.get(feed_url)
    results = (
        response.data
        if isinstance(response.data, list)
        else response.data.get("results", [])
    )

    assert len(results) >= 1

    user.is_banned = True
    user.save()

    response = api_client.get(feed_url)
    results_after = (
        response.data
        if isinstance(response.data, list)
        else response.data.get("results", [])
    )
    assert len(results_after) == 0


@pytest.mark.django_db
def test_admin_action_ban_multiple_users():
    """Testa a Action customizada do Admin para banir múltiplos usuários em massa."""
    admin_user = User.objects.create_superuser(
        username="admin", password="password123", email="admin@test.com"
    )
    u1 = User.objects.create_user(
        username="bot1", password="password123", email="bot1@t.com", full_name="Bot 1"
    )
    u2 = User.objects.create_user(
        username="bot2", password="password123", email="bot2@t.com", full_name="Bot 2"
    )

    ma = CustomUserAdmin(User, AdminSite())
    rf = RequestFactory()
    request = rf.get("/")
    request.user = admin_user

    # Usamos '_' para ignorar o retorno do mock e evitar W0612 (unused variable)
    with mock.patch.object(CustomUserAdmin, "message_user") as _:
        queryset = User.objects.filter(username__in=["bot1", "bot2", "admin"])
        ma.ban_selected_users(request, queryset)

    u1.refresh_from_db()
    u2.refresh_from_db()
    admin_user.refresh_from_db()

    assert u1.is_banned is True
    assert u2.is_banned is True
    assert admin_user.is_banned is False  # Admin não deve se auto-banir
    assert u1.ban_reason == "Banimento via Admin."
