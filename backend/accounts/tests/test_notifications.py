import pytest
from django.urls import reverse
from rest_framework import status
from accounts.models import Notification, Follow, Report , User, Comment, Like, Post

@pytest.mark.django_db
class TestNotifications:

    def test_notification_created_on_follow(self, user, api_client):
        """Valida se o signal cria notificação ao seguir alguém"""
        # Criamos um segundo usuário para ser seguido
        other_user = User.objects.create_user(
            username="otheruser", 
            email="other@test.com", 
            password="password123"
        )
        
        # Simula a criação do Follow (isso deve disparar o Signal)
        Follow.objects.create(follower=user, following=other_user)
        
        assert Notification.objects.filter(
            recipient=other_user, 
            sender=user, 
            notification_type='FOLLOW'
        ).exists()

    def test_user_cannot_see_others_notifications(self, auth_client, user):
        """Cybersecurity: Valida que um user não acessa notificações de outro (IDOR)"""
        other_user = User.objects.create_user(username="target", email="target@test.com")
        
        # Criamos uma notificação que NÃO é para o usuário logado
        Notification.objects.create(
            recipient=other_user,
            sender=other_user,
            notification_type='LIKE'
        )
        
        url = reverse('notification-list')
        response = auth_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        # O resultado deve ser vazio pois a notificação não é dele
        assert len(response.data) == 0

    def test_mark_as_read_endpoint(self, auth_client, user):
        """Valida o endpoint de marcar como lida usando o auth_client da fixture"""
        notif = Notification.objects.create(
            recipient=user,
            sender=user, # aqui apenas para teste rápido
            notification_type='COMMENT'
        )
        
        url = reverse('notification-mark-as-read', kwargs={'pk': notif.pk})
        response = auth_client.post(url)
        
        notif.refresh_from_db()
        assert response.status_code == status.HTTP_200_OK
        assert notif.is_read is True
    
    def test_notification_on_report_resolved(self, user, other_user):
        """Valida notificação de denúncia aceite e automação de delete"""
        post = Post.objects.create(user=other_user, content="Post ofensivo")
        
        report = Report.objects.create(
            reporter=user, 
            post=post, 
            reason='spam'
        )
        
        # SIMULAÇÃO DA ACTION DO ADMIN (Igual fizemos no outro arquivo)
        # 1. Primeiro escondemos o post (Soft Delete)
        post.is_deleted = True
        post.save()
        
        # 2. Depois resolvemos a denúncia (Dispara o Signal)
        report.status = 'resolved'
        report.save()
        
        # 3. Verificações
        notification = Notification.objects.get(recipient=user, notification_type='REPORT_UPDATE')
        assert "aceite" in notification.text
        
        post.refresh_from_db()
        assert post.is_deleted is True

    def test_notification_on_report_ignored(self, user, other_user):
        """Valida notificação de denúncia rejeitada"""
        post = Post.objects.create(user=other_user, content="Post ok")
        report = Report.objects.create(reporter=user, post=post, reason='other')
        
        report.status = 'ignored'
        report.save()
        
        notification = Notification.objects.get(recipient=user, notification_type='REPORT_UPDATE')
        assert "rejeitada" in notification.text
    
    def test_notification_created_on_like(self, api_client, user, post_to_report):
        """Valida se o signal cria notificação ao dar like (exceto no próprio post)"""
        # Outro usuário dá like no post do common_user (post_to_report)
        liker = User.objects.create_user(username="liker", email="liker@test.com")
        
        # Simula o Like (dispara o Signal)
        Like.objects.create(user=liker, post=post_to_report)
        
        assert Notification.objects.filter(
            recipient=post_to_report.user, 
            sender=liker, 
            notification_type='LIKE',
            post=post_to_report
        ).exists()

    def test_no_notification_on_self_like(self, user, post_to_report):
        """Valida que o usuário NÃO recebe notificação se der like no próprio post"""
        # post_to_report pertence ao common_user (user)
        Like.objects.create(user=post_to_report.user, post=post_to_report)
        
        assert not Notification.objects.filter(
            recipient=post_to_report.user, 
            notification_type='LIKE'
        ).exists()

    def test_notification_created_on_comment(self, user, post_to_report):
        """Valida se o signal cria notificação ao comentar (exceto no próprio post)"""
        commenter = User.objects.create_user(username="commenter", email="commenter@test.com")
        
        Comment.objects.create(
            post=post_to_report, 
            author=commenter, 
            content="Belo post!"
        )
        
        assert Notification.objects.filter(
            recipient=post_to_report.user, 
            sender=commenter, 
            notification_type='COMMENT',
            post=post_to_report
        ).exists()