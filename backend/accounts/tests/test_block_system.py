"""Testes para o sistema de bloqueio, invisibilidade mútua e restrições."""

import pytest
from django.db import IntegrityError
from django.urls import NoReverseMatch, reverse
from rest_framework import status

from accounts.models import Block, Follow, Notification, Post

# pylint: disable=redefined-outer-name, unused-argument


@pytest.fixture
def post_factory(db):
    """Cria posts para testar a visibilidade no feed."""

    def _create_post(user, content="Conteúdo de teste"):
        return Post.objects.create(user=user, content=content)

    return _create_post


@pytest.mark.django_db
class TestBlockSystem:
    """Valida a lógica de bloqueio e seu impacto em outras funcionalidades."""

    def get_url(self, action_name, pk=None):
        """Auxiliar para resolver URLs com ou sem namespace."""
        names = [f"profile-{action_name}", f"accounts:profile-{action_name}"]
        for name in names:
            try:
                if pk:
                    return reverse(name, kwargs={"pk": pk})
                return reverse(name)
            except NoReverseMatch:
                continue
        raise NoReverseMatch(f"Rota {action_name} não encontrada.")

    def test_block_user_successfully(self, auth_client, user, user_b_profile):
        """TAL-14: Testa bloqueio e remoção automática de follow."""
        target_user = user_b_profile.user
        Follow.objects.create(follower=user, following=target_user)

        url = self.get_url("block-user", pk=user_b_profile.id)
        response = auth_client.post(url)

        assert response.status_code == status.HTTP_201_CREATED
        assert Block.objects.filter(blocker=user, blocked=target_user).exists()
        assert not Follow.objects.filter(follower=user, following=target_user).exists()

    def test_cannot_follow_blocked_user(self, auth_client, user, user_b_profile):
        """TAL-14: Impede follow se houver bloqueio de qualquer lado."""
        target_user = user_b_profile.user
        Block.objects.create(blocker=target_user, blocked=user)

        url = self.get_url("follow-toggle", pk=user_b_profile.id)
        response = auth_client.post(url)

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "Action unavailable due to blocks" in response.data["error"]

    def test_blocked_user_posts_hidden_in_feed(
        self, auth_client, user, user_b, post_factory
    ):
        """TAL-14: Posts de bloqueados não aparecem no feed global."""
        post_factory(user=user_b, content="Post invisível")
        Block.objects.create(blocker=user, blocked=user_b)

        try:
            url = reverse("post-list")
        except NoReverseMatch:
            url = reverse("api:post-list")

        response = auth_client.get(url)
        results = (
            response.data
            if isinstance(response.data, list)
            else response.data.get("results", [])
        )

        assert len(results) == 0

    def test_cannot_block_self(self, auth_client, user):
        """Garante que o utilizador não se bloqueia a si mesmo."""
        url = self.get_url("block-user", pk=user.profile.id)
        response = auth_client.post(url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Auto-bloqueio não permitido" in response.data["error"]

    def test_unfollow_always_allowed_but_starts_cooldown(
        self, auth_client, user, user_b_profile
    ):
        """TAL-12: Unfollow marca unfollowed_at no banco para cooldown."""
        target_user = user_b_profile.user
        Follow.objects.create(follower=user, following=target_user)

        url = self.get_url("follow-toggle", pk=user_b_profile.id)
        response = auth_client.post(url)

        assert response.status_code == 200
        assert response.data["is_following"] is False

        follow_obj = Follow.all_objects.get(follower=user, following=target_user)
        assert follow_obj.unfollowed_at is not None

    def test_cannot_re_follow_before_cooldown(self, auth_client, user, user_b_profile):
        """TAL-12: Impede voltar a seguir antes de passar o tempo de cooldown."""
        url = self.get_url("follow-toggle", pk=user_b_profile.id)
        auth_client.post(url)
        auth_client.post(url)

        response = auth_client.post(url)
        assert response.status_code == 400
        assert "Wait" in response.data.get("error", "")

    def test_block_removes_follow_reciprocally(self, auth_client, user, user_b):
        """Garante que o bloqueio destrói qualquer relação de follow mútua."""
        Follow.objects.create(follower=user, following=user_b)
        Follow.objects.create(follower=user_b, following=user)

        url = self.get_url("block-user", pk=user_b.profile.id)
        auth_client.post(url)

        assert Follow.objects.filter(follower=user, following=user_b).count() == 0
        assert Follow.objects.filter(follower=user_b, following=user).count() == 0

    def test_prevent_duplicate_active_follows(self, auth_client, user, user_b_profile):
        """Garante que o banco de dados impede duplicidade de follows ativos."""
        url = self.get_url("follow-toggle", pk=user_b_profile.id)
        auth_client.post(url)

        with pytest.raises(IntegrityError):
            Follow.objects.create(follower=user, following=user_b_profile.user)

    def test_hybrid_feed_excludes_blocked_users(
        self, auth_client, user, user_b, post_factory
    ):
        """Garante que posts de usuários que me bloquearam não aparecem no meu feed."""
        post_factory(user=user_b, content="Post Secreto de B")
        Block.objects.create(blocker=user_b, blocked=user)

        url = None
        for name in ["post-list", "posts-list", "feed"]:
            try:
                url = reverse(name)
                break
            except NoReverseMatch:
                continue

        if not url:
            pytest.skip("Rota do feed não encontrada.")

        response = auth_client.get(url)
        results = (
            response.data
            if isinstance(response.data, list)
            else response.data.get("results", [])
        )

        contents = [p.get("content") for p in results]
        assert "Post Secreto de B" not in contents

    def test_block_toggle_and_follow_removal(self, auth_client, user, user_b_profile):
        """Testa o ciclo: Seguir -> Bloquear (Remove Follow) -> Desbloquear."""
        target_user = user_b_profile.user
        url = self.get_url("block-user", pk=user_b_profile.id)

        Follow.objects.create(follower=user, following=target_user)
        auth_client.post(url)  # Bloqueia

        assert not Follow.objects.filter(follower=user, following=target_user).exists()

        response = auth_client.post(url)  # Desbloqueia
        assert response.status_code == 200
        assert not Block.objects.filter(blocker=user, blocked=target_user).exists()

    def test_list_blocked_users(self, auth_client, user, user_b):
        """TAL-14: Garante que o utilizador consegue listar quem ele bloqueou."""
        Block.objects.create(blocker=user, blocked=user_b)

        url = reverse("profile-blocked-users")
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        blocked_usernames = [item["username"] for item in response.data]
        assert user_b.username in blocked_usernames

    def test_mutual_invisibility_in_search(self, auth_client, user, user_b_profile):
        """Garante que a busca é cega para ambos os lados do bloqueio."""
        target_user = user_b_profile.user
        Block.objects.create(blocker=user, blocked=target_user)

        search_url = reverse("user-search") + f"?q={target_user.username}"
        response_a = auth_client.get(search_url)
        assert len(response_a.data) == 0

        auth_client.force_authenticate(user=target_user)
        response_b = auth_client.get(reverse("user-search") + f"?q={user.username}")
        assert len(response_b.data) == 0

    def test_notifications_filtered_by_block(
        self, auth_client, user, user_b, post_factory
    ):
        """Garante que notificações de bloqueados somem da lista."""
        my_post = post_factory(user=user)
        Notification.objects.create(
            recipient=user, sender=user_b, notification_type="LIKE", post=my_post
        )

        Block.objects.create(blocker=user, blocked=user_b)
        response = auth_client.get(reverse("notification-list"))

        results = (
            response.data
            if isinstance(response.data, list)
            else response.data.get("results", [])
        )
        assert len(results) == 0

    def test_suggestions_exclude_mutual_blocks(self, auth_client, user, user_b_profile):
        """Garante que bloqueados não aparecem em sugestões."""
        Block.objects.create(blocker=user_b_profile.user, blocked=user)

        response = auth_client.get(reverse("suggested-follows"))
        usernames = [p["username"] for p in response.data]
        assert user_b_profile.user.username not in usernames

    def test_profile_detail_access_denied_if_blocked(
        self, auth_client, user, user_b_profile
    ):
        """Garante que perfis bloqueados retornam 404."""
        Block.objects.create(blocker=user_b_profile.user, blocked=user)

        url = reverse("profile-detail", kwargs={"pk": user_b_profile.id})
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_own_profile_remains_visible_to_self(self, auth_client, user):
        """Bug Fix: Garante que o usuário logado ainda vê o próprio perfil."""
        url = reverse("profile-detail", kwargs={"pk": user.profile.id})
        response = auth_client.get(url)
        assert response.status_code == status.HTTP_200_OK
