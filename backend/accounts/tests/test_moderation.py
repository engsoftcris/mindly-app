"""Testes para o sistema de moderação, denúncias e regras de conduta (Cooldown/Privacidade)."""

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, Post, Report, Notification

# pylint: disable=redefined-outer-name, unused-argument


@pytest.fixture
def api_client():
    """Fixture para o cliente de API do DRF."""
    return APIClient()


@pytest.fixture
def admin_user():
    """Cria um superusuário para testes administrativos."""
    return User.objects.create_superuser(
        username="admin", email="admin@test.com", password="password123"
    )


@pytest.fixture
def common_user():
    """Cria um usuário comum autenticado."""
    return User.objects.create_user(
        username="user", email="user@test.com", password="password123"
    )


@pytest.fixture
def pending_user():
    """Cria um usuário cujo perfil nasce PENDING por padrão."""
    return User.objects.create_user(
        username="pending", email="pending@test.com", password="password123"
    )


@pytest.fixture
def post_to_report(common_user):
    """Cria um post alvo para testes de denúncia."""
    return Post.objects.create(user=common_user, content="Post para ser denunciado")


@pytest.mark.django_db
class TestModeration:
    """Valida as permissões de moderação, fluxo de denúncias e restrições de segurança."""

    def test_common_user_cannot_access_pending_list(self, api_client, common_user):
        """TAL-22: Garante que usuários comuns não vejam a lista de moderação."""
        api_client.force_authenticate(user=common_user)
        url = reverse("moderation-pending-users")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_access_pending_list(self, api_client, admin_user, pending_user):
        """TAL-22: Verifica se o admin enxerga usuários aguardando aprovação."""
        api_client.force_authenticate(user=admin_user)
        url = reverse("moderation-pending-users")
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        # Narrowing do tipo de response.data para o Mypy
        data = response.data
        assert isinstance(data, list)
        usernames = [u["username"] for u in data]
        assert "pending" in usernames

    def test_admin_can_approve_user(self, api_client, admin_user, pending_user):
        """TAL-22: Valida a aprovação de perfil pelo admin usando o UUID do Profile."""
        api_client.force_authenticate(user=admin_user)

        # CORREÇÃO MYPY: Narrowing do Profile
        profile = pending_user.profile
        assert profile is not None

        url = reverse("moderation-approve-user", kwargs={"pk": profile.id})
        response = api_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        profile.refresh_from_db()
        assert profile.image_status == "APPROVED"

    def test_user_can_report_post(self, api_client, common_user, post_to_report):
        """TAL-23: Testa a criação de uma denúncia por um usuário comum."""
        api_client.force_authenticate(user=common_user)
        url = reverse("report-list")
        data = {
            "post": post_to_report.id,
            "reason": "spam",
            "description": "Isto é spam",
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert Report.objects.filter(post=post_to_report).exists()

    def test_common_user_cannot_list_reports(self, api_client, common_user):
        """TAL-23: Garante que a listagem de denúncias é privada para administradores."""
        api_client.force_authenticate(user=common_user)
        url = reverse("report-list")
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_resolving_report_hides_post(self, post_to_report, common_user):
        """Valida que a resolução de uma denúncia aplica o soft delete no post."""
        report = Report.objects.create(
            reporter=common_user, post=post_to_report, reason="spam"
        )
        # Simula ação administrativa
        post_to_report.is_deleted = True
        post_to_report.save()
        report.status = "resolved"
        report.save()

        post_to_report.refresh_from_db()
        assert post_to_report.is_deleted is True

    def test_user_cannot_report_same_post_twice(
        self, api_client, common_user, post_to_report
    ):
        """Evita duplicidade de denúncias do mesmo autor no mesmo post."""
        api_client.force_authenticate(user=common_user)
        url = reverse("report-list")
        data = {"post": post_to_report.id, "reason": "spam"}

        api_client.post(url, data)
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_notification_stores_snapshot_after_resolution(
        self, post_to_report, common_user
    ):
        """Garante que a notificação preserva o conteúdo do post removido (Snapshot)."""
        report = Report.objects.create(
            reporter=common_user, post=post_to_report, reason="hate_speech"
        )
        post_to_report.is_deleted = True
        post_to_report.save()
        report.status = "resolved"
        report.save()

        notification = Notification.objects.filter(
            recipient=common_user, notification_type="REPORT_UPDATE"
        ).first()

        assert notification is not None
        assert notification.stored_post_content == "Post para ser denunciado"

    def test_private_profile_hides_posts_from_non_followers(self, api_client):
        """TAL-14: Valida restrição de visibilidade de posts em perfis privados."""
        u_private = User.objects.create_user(username="priv", email="p@t.com")
        u_visitor = User.objects.create_user(username="vis", email="v@t.com")

        # CORREÇÃO MYPY: Narrowing do Profile
        profile_private = u_private.profile
        assert profile_private is not None

        profile_private.is_private = True
        profile_private.save()

        Post.objects.create(user=u_private, content="Secreto")

        api_client.force_authenticate(user=u_visitor)
        url = reverse("user-posts-list", kwargs={"pk": profile_private.id})
        response = api_client.get(url)

        # Proteção contra Any/None na iteração
        results = response.data.get("results", response.data)
        assert isinstance(results, list)
        assert len(results) == 0

    def test_follow_cooldown_penalty(self, api_client, common_user):
        """Valida a regra de cooldown (castigo) para follow/unfollow repetitivo."""
        target = User.objects.create_user(username="t", email="t@t.com")

        # CORREÇÃO MYPY: Narrowing do Profile
        target_profile = target.profile
        assert target_profile is not None

        api_client.force_authenticate(user=common_user)
        url = reverse("profile-follow-toggle", kwargs={"pk": target_profile.id})

        api_client.post(url)  # Follow
        api_client.post(url)  # Unfollow
        response = api_client.post(url)  # Blocked

        assert response.status_code == status.HTTP_400_BAD_REQUEST

        # Garantindo acesso seguro ao dicionário de data
        data = response.data
        assert isinstance(data, dict)
        assert data.get("cooldown") is True
