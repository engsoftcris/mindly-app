import pytest
from django.urls import reverse
from rest_framework import status
from accounts.models import Notification, Follow, Like, User

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