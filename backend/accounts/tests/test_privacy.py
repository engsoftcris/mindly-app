"""Testes de privacidade para perfis restritos e visibilidade de conteúdo."""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse, NoReverseMatch
from rest_framework import status
from accounts.models import Post

User = get_user_model()

# pylint: disable=redefined-outer-name


@pytest.mark.django_db
def test_outsider_cannot_see_private_profile_posts(api_client):
    """TAL-25: Garante que não-seguidores não vejam posts de perfis privados."""
    # 1. Criar Utilizador A (Privado)
    user_a = User.objects.create_user(
        username="private_user", email="a@test.com", password="123"
    )

    # CORREÇÃO MYPY: Garantir que profile não é None
    profile_a = user_a.profile
    assert profile_a is not None

    profile_a.is_private = True
    profile_a.save()

    Post.objects.create(user=user_a, content="Secret content")

    # 2. Criar Utilizador B (Visitante)
    user_b = User.objects.create_user(
        username="visitor", email="b@test.com", password="123"
    )
    api_client.force_authenticate(user=user_b)

    # 3. Tentar aceder ao perfil
    try:
        url = reverse("profile-detail", kwargs={"pk": profile_a.pk})
    except NoReverseMatch:
        url = f"/api/accounts/profiles/{profile_a.pk}/"

    response = api_client.get(url)

    # Asserts
    assert response.status_code == status.HTTP_200_OK
    assert response.data["is_private"] is True
    assert len(response.data.get("posts", [])) == 0
    assert response.data.get("is_restricted") is True


@pytest.mark.django_db
def test_follower_can_see_private_profile_posts(api_client):
    """TAL-25: Garante que seguidores aprovados consigam ver posts privados."""
    # 1. Criar Utilizador A (Privado)
    user_a = User.objects.create_user(
        username="star", email="star@test.com", password="123"
    )

    # CORREÇÃO MYPY: Garantir que profile não é None
    profile_a = user_a.profile
    assert profile_a is not None

    profile_a.is_private = True
    profile_a.save()

    Post.objects.create(user=user_a, content="Conteúdo VIP")
    user_a.refresh_from_db()

    # 2. Criar Utilizador B e fazê-lo SEGUIR o A
    user_b = User.objects.create_user(
        username="follower", email="f@test.com", password="123"
    )
    user_b.following.add(user_a)
    api_client.force_authenticate(user=user_b)

    # 3. Ver o perfil
    try:
        url = reverse("profile-detail", kwargs={"pk": profile_a.id})
    except NoReverseMatch:
        url = f"/api/accounts/profiles/{profile_a.id}/"

    response = api_client.get(url)

    assert response.status_code == status.HTTP_200_OK
    # Se o B segue o A, os posts devem aparecer
    assert len(response.data.get("posts", [])) > 0
