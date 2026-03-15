"""Testes de cenários extremos para follow, block e performance do feed."""

from datetime import timedelta
import pytest
from django.urls import reverse, NoReverseMatch
from django.utils import timezone
from rest_framework import status
from accounts.models import User, Profile, Follow, Block, Post


def get_profile_url(action_name, pk=None):
    """Auxiliar para resolver URLs do ProfileViewSet"""
    try:
        return reverse(f"profile-{action_name}", kwargs={"pk": pk} if pk else {})
    except NoReverseMatch:
        try:
            return reverse(action_name, kwargs={"pk": pk} if pk else {})
        except NoReverseMatch:
            profiles_url = reverse("profile-list")
            if pk:
                return f"{profiles_url}{pk}/{action_name}/"
            return f"{profiles_url}{action_name}/"


@pytest.mark.django_db
class TestFollowEdgeCases:
    """Testes para cenários extremos do sistema de follow"""

    @pytest.fixture
    def setup_users(self):
        """Fixture para criar usuários de teste"""
        user1 = User.objects.create_user(
            username="user1", email="user1@test.com", password="testpass123"
        )
        user2 = User.objects.create_user(
            username="user2", email="user2@test.com", password="testpass123"
        )
        Profile.objects.get_or_create(user=user1)
        Profile.objects.get_or_create(user=user2)
        return user1, user2

    def test_follow_unfollow_rapidly_10_times(self, api_client, setup_users):
        """Tenta seguir e unfollow 10x rapidamente - deve respeitar cooldown"""
        user1, user2 = setup_users
        api_client.force_authenticate(user=user1)
        url = get_profile_url("follow-toggle", user2.profile.id)

        results = []
        for _ in range(10):  # Corrigido: 'i' mudado para '_'
            response = api_client.post(url)
            results.append(response.status_code)

            if response.status_code == 400:
                assert "Wait" in response.data["error"]
                break

        assert any(r in [200, 201] for r in results)

        follow = Follow.all_objects.filter(follower=user1, following=user2).first()
        assert follow is not None
        if follow.unfollowed_at:
            assert timezone.now() - follow.unfollowed_at < timedelta(seconds=10)

    def test_follow_after_block_unblock(self, api_client, setup_users):
        """Follow após bloqueio e desbloqueio deve funcionar"""
        user1, user2 = setup_users
        api_client.force_authenticate(user=user1)

        block_url = get_profile_url("block", user2.profile.id)
        api_client.post(block_url)  # Bloqueia
        api_client.post(block_url)  # Desbloqueia

        follow_url = get_profile_url("follow-toggle", user2.profile.id)
        response = api_client.post(follow_url)
        assert response.status_code in [200, 201]
        assert response.data["is_following"] is True

    def test_follow_user_who_blocked_you(self, api_client, setup_users):
        """Tentar seguir quem te bloqueou deve retornar 403"""
        user1, user2 = setup_users
        api_client.force_authenticate(user=user1)

        Block.objects.create(blocker=user2, blocked=user1)

        url = get_profile_url("follow-toggle", user2.profile.id)
        response = api_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Action unavailable due to blocks" in response.data["error"]

    def test_concurrent_follow_requests(self, api_client, setup_users):
        """Múltiplas requisições simultâneas de follow"""
        user1, user2 = setup_users
        api_client.force_authenticate(user=user1)
        url = get_profile_url("follow-toggle", user2.profile.id)

        responses = []
        for _ in range(5):
            responses.append(api_client.post(url))

        status_codes = [r.status_code for r in responses]
        assert status_codes.count(201) <= 1
        assert len(responses) == 5

    def test_follow_after_long_time_unfollow(self, api_client, setup_users):
        """Follow após muito tempo (dias) de unfollow deve funcionar imediatamente"""
        user1, user2 = setup_users
        api_client.force_authenticate(user=user1)

        follow = Follow.objects.create(follower=user1, following=user2)
        follow.unfollowed_at = timezone.now() - timedelta(days=7)
        follow.save()

        url = get_profile_url("follow-toggle", user2.profile.id)
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["is_following"] is True
        follow.refresh_from_db()
        assert follow.unfollowed_at is None


@pytest.mark.django_db
class TestBlockEdgeCases:
    """Testes extremos para sistema de bloqueio"""

    @pytest.fixture
    def setup_users(self):
        """Fixture para criar usuários de teste"""
        user1 = User.objects.create_user(
            username="user1", email="user1@test.com", password="testpass123"
        )
        user2 = User.objects.create_user(
            username="user2", email="user2@test.com", password="testpass123"
        )
        Profile.objects.get_or_create(user=user1)
        Profile.objects.get_or_create(user=user2)
        return user1, user2

    def test_block_user_who_blocked_you(self, api_client, setup_users):
        """Bloqueio mútuo deve funcionar"""
        user1, user2 = setup_users
        api_client.force_authenticate(user=user1)

        Block.objects.create(blocker=user2, blocked=user1)

        url = get_profile_url("block", user2.profile.id)
        response = api_client.post(url)

        assert response.status_code == status.HTTP_201_CREATED
        assert Block.objects.filter(blocker=user1, blocked=user2).exists()
        assert Block.objects.filter(blocker=user2, blocked=user1).exists()


@pytest.mark.django_db
class TestFeedPerformance:
    """Testes de performance e cenários extremos do feed"""

    @pytest.fixture
    def heavy_feed_setup(self, django_db_blocker):
        """Cria muitos dados para testar performance"""
        with django_db_blocker.unblock():
            user = User.objects.create_user(
                username="main", email="main@test.com", password="testpass123"
            )
            Profile.objects.get_or_create(user=user)

            users = []
            for i in range(100):
                u = User.objects.create_user(
                    username=f"user{i}",
                    email=f"user{i}@test.com",
                    password="testpass123",
                )
                Profile.objects.get_or_create(user=u)
                users.append(u)

            for u in users[:50]:
                Follow.objects.create(follower=user, following=u)

            for u in users:
                for _ in range(2):
                    Post.objects.create(user=u, content=f"Post by {u.username}")

            Block.objects.create(blocker=user, blocked=users[0])
            Block.objects.create(blocker=users[1], blocked=user)

            return user

    def test_feed_performance_basic(self, api_client, heavy_feed_setup):
        """Valida que o feed carrega mesmo com muitos dados (W0613 fix)"""
        api_client.force_authenticate(user=heavy_feed_setup)
        url = reverse("network-feed")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
