"""Testes para os filtros de mídia e status de moderação no perfil (TAL-20)."""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from accounts.models import Post

User = get_user_model()


@pytest.mark.django_db
class TestProfilePostsFilter:
    """Testes para os filtros de mídia e status de moderação no perfil (TAL-20)."""

    @pytest.fixture
    def setup_data(self, api_client):
        """Prepara usuários e diferentes tipos de posts para testar filtros."""
        user = User.objects.create_user(
            username="tester_filters", email="filter@test.com", password="password123"
        )
        api_client.force_authenticate(user=user)

        # CORREÇÃO MYPY: Garantir que profile não é None
        profile = user.profile
        assert profile is not None

        # Criação dos cenários de teste
        Post.objects.create(user=user, content="Texto puro", media=None)
        Post.objects.create(user=user, content="Uma foto", media="image.jpg")
        Post.objects.create(user=user, content="Um video", media="video.mp4")
        Post.objects.create(
            user=user,
            content="Banido",
            media="rejeitado.jpg",
            moderation_status="REJECTED",
        )

        url = reverse("user-posts-list", kwargs={"pk": profile.id})

        return {"api_client": api_client, "url": url, "user": user}

    def test_filter_media_only_true(self, setup_data):
        """TAL-20: Testa se media_only=true remove posts sem arquivo"""
        client = setup_data["api_client"]
        url = setup_data["url"]

        response = client.get(f"{url}?media_only=true")

        assert response.status_code == status.HTTP_200_OK

        # CORREÇÃO MYPY: Garantir que results é uma lista para iteração
        results = response.data.get("results", response.data)
        assert isinstance(results, list)

        assert len(results) == 2
        for post in results:
            assert post["media"] is not None
            assert post["moderation_status"] != "REJECTED"

    def test_filter_by_type_image(self, setup_data):
        """TAL-20: Testa se type=image retorna apenas extensões de imagem"""
        client = setup_data["api_client"]
        url = setup_data["url"]

        response = client.get(f"{url}?media_only=true&type=image")

        results = response.data.get("results", response.data)
        assert isinstance(results, list)

        assert len(results) == 1
        assert ".jpg" in results[0]["media"]

    def test_filter_by_type_video(self, setup_data):
        """TAL-20: Testa se type=video retorna apenas extensões de vídeo"""
        client = setup_data["api_client"]
        url = setup_data["url"]

        response = client.get(f"{url}?media_only=true&type=video")

        results = response.data.get("results", response.data)
        assert isinstance(results, list)

        assert len(results) == 1
        assert ".mp4" in results[0]["media"]

    def test_moderation_security(self, setup_data):
        """Garante que posts REJECTED não aparecem nem no feed geral do perfil"""
        client = setup_data["api_client"]
        url = setup_data["url"]

        response = client.get(url)

        results = response.data.get("results", response.data)
        assert isinstance(results, list)

        assert len(results) == 3
        for post in results:
            assert post["content"] != "Banido"
            assert post["moderation_status"] != "REJECTED"
