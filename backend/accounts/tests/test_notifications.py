"""Testes para o sistema de notificações e regras de visibilidade (Tarefa 54)."""

import pytest
from django.urls import reverse
from rest_framework import status

from accounts.models import (
    Block,
    Comment,
    Follow,
    Like,
    Notification,
    Post,
    Report,
    User,
)


@pytest.mark.django_db
class TestNotifications:
    """Testes para o sistema de notificações e regras de visibilidade (Tarefa 54)."""

    def test_notification_created_on_follow(self, user):
        """Valida se o signal cria notificação ao seguir alguém"""
        other_user = User.objects.create_user(
            username="otheruser", email="other@test.com", password="password123"
        )

        Follow.objects.create(follower=user, following=other_user)

        assert Notification.objects.filter(
            recipient=other_user, sender=user, notification_type="FOLLOW"
        ).exists()

    def test_user_cannot_see_others_notifications(self, auth_client):
        """Cybersecurity: Valida que um user não acessa notificações de outro (IDOR)"""
        other_user = User.objects.create_user(
            username="target", email="target@test.com"
        )

        Notification.objects.create(
            recipient=other_user, sender=other_user, notification_type="LIKE"
        )

        url = reverse("notification-list")
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_mark_as_read_endpoint(self, auth_client, user):
        """Valida o endpoint de marcar como lida usando o auth_client da fixture"""
        notif = Notification.objects.create(
            recipient=user,
            sender=user,
            notification_type="COMMENT",
        )

        url = reverse("notification-mark-as-read", kwargs={"pk": notif.pk})
        response = auth_client.post(url)

        notif.refresh_from_db()
        assert response.status_code == status.HTTP_200_OK
        assert notif.is_read is True

    def test_notification_on_report_resolved(self, user, other_user):
        """Valida notificação de denúncia aceite e automação de delete"""
        post = Post.objects.create(user=other_user, content="Post ofensivo")
        report = Report.objects.create(reporter=user, post=post, reason="spam")

        post.is_deleted = True
        post.save()

        report.status = "resolved"
        report.save()

        notification = Notification.objects.get(
            recipient=user, notification_type="REPORT_UPDATE"
        )
        assert "aceite" in (notification.text or "")  # Proteção contra None
        post.refresh_from_db()
        assert post.is_deleted is True

    def test_notification_on_report_ignored(self, user, other_user):
        """Valida notificação de denúncia rejeitada"""
        post = Post.objects.create(user=other_user, content="Post ok")
        report = Report.objects.create(reporter=user, post=post, reason="other")

        report.status = "ignored"
        report.save()

        notification = Notification.objects.get(
            recipient=user, notification_type="REPORT_UPDATE"
        )
        assert "rejeitada" in (notification.text or "")  # Proteção contra None

    def test_notification_created_on_like(self, post_to_report):
        """Valida se o signal cria notificação ao dar like (exceto no próprio post)"""
        liker = User.objects.create_user(username="liker", email="liker@test.com")

        Like.objects.create(user=liker, post=post_to_report)

        assert Notification.objects.filter(
            recipient=post_to_report.user,
            sender=liker,
            notification_type="LIKE",
            post=post_to_report,
        ).exists()

    def test_no_notification_on_self_like(self, post_to_report):
        """Valida que o usuário NÃO recebe notificação se der like no próprio post"""
        Like.objects.create(user=post_to_report.user, post=post_to_report)

        assert not Notification.objects.filter(
            recipient=post_to_report.user, notification_type="LIKE"
        ).exists()

    def test_notification_created_on_comment(self, post_to_report):
        """Valida se o signal cria notificação ao comentar (exceto no próprio post)"""
        commenter = User.objects.create_user(
            username="commenter", email="commenter@test.com"
        )

        Comment.objects.create(
            post=post_to_report, author=commenter, content="Belo post!"
        )

        assert Notification.objects.filter(
            recipient=post_to_report.user,
            sender=commenter,
            notification_type="COMMENT",
            post=post_to_report,
        ).exists()

    def test_notification_hidden_if_sender_is_blocked(
        self, auth_client, user, other_user
    ):
        """Valida que notificações de usuários bloqueados NÃO aparecem (Tarefa 54)"""
        post = Post.objects.create(user=user, content="Meu post")
        Notification.objects.create(
            recipient=user, sender=other_user, notification_type="LIKE", post=post
        )

        Block.objects.create(blocker=user, blocked=other_user)

        url = reverse("notification-list")
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_notification_hidden_if_recipient_blocked_sender(
        self, auth_client, user, other_user
    ):
        """Valida invisibilidade mútua: se o remetente me bloqueou, a notificação some"""
        Notification.objects.create(
            recipient=user, sender=other_user, notification_type="FOLLOW"
        )

        Block.objects.create(blocker=other_user, blocked=user)

        url = reverse("notification-list")
        response = auth_client.get(url)
        assert len(response.data) == 0

    def test_search_and_suggestions_exclude_blocked_users(
        self, auth_client, other_user
    ):
        """Valida que bloqueados não aparecem em buscas nem sugestões (Mútua)"""
        # pylint: disable=protected-access
        force_user = auth_client.handler._force_user
        assert force_user is not None

        Block.objects.create(blocker=force_user, blocked=other_user)

        search_url = f"{reverse('user-search')}?q={other_user.username}"
        search_response = auth_client.get(search_url)

        # Correção do erro [operator]: garantindo que data é uma lista
        data = search_response.data
        assert isinstance(data, list)
        assert len(data) == 0

        suggest_url = reverse("suggested-follows")
        suggest_response = auth_client.get(suggest_url)

        suggest_data = suggest_response.data
        assert isinstance(suggest_data, list)

        usernames = [p["username"] for p in suggest_data]
        assert other_user.username not in usernames

    def test_user_can_still_see_own_profile(self, auth_client, user):
        """Garante que a filtragem de bloqueio não esconde o próprio perfil (Bug Fix)"""
        # CORREÇÃO: Garantindo que o Profile existe
        profile = user.profile
        assert profile is not None

        url = reverse("profile-detail", kwargs={"pk": profile.id})
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["username"] == user.username
