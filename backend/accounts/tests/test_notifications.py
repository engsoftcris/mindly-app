import pytest
from django.urls import reverse
from rest_framework import status
from accounts.models import Block, Notification, Follow, Report , User, Comment, Like, Post

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
    
    # --- NOVOS TESTES PARA A TAREFA 54 (BLINDAGEM MÚTUA) ---

    def test_notification_hidden_if_sender_is_blocked(self, auth_client, user, other_user):
        """Valida que notificações de usuários bloqueados NÃO aparecem na listagem (Tarefa 54)"""
        # 1. 'other_user' interage com o meu post (Gera notificação)
        post = Post.objects.create(user=user, content="Meu post")
        Notification.objects.create(
            recipient=user,
            sender=other_user,
            notification_type='LIKE',
            post=post
        )
        
        # 2. Eu bloqueio o 'other_user'
        Block.objects.create(blocker=user, blocked=other_user)
        
        # 3. Tento ler as minhas notificações
        url = reverse('notification-list')
        response = auth_client.get(url)
        
        # A notificação deve ser filtrada pela ViewSet (Muralha Mútua)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 0

    def test_notification_hidden_if_recipient_blocked_sender(self, auth_client, user, other_user):
        """Valida invisibilidade mútua: se o remetente me bloqueou, a notificação dele some"""
        # 1. Recebo uma notificação legítima
        Notification.objects.create(recipient=user, sender=other_user, notification_type='FOLLOW')
        
        # 2. O OUTRO usuário me bloqueia (Invisibilidade mútua)
        Block.objects.create(blocker=other_user, blocked=user)
        
        # 3. Minha lista de notificações deve ignorar quem me bloqueou
        url = reverse('notification-list')
        response = auth_client.get(url)
        
        assert len(response.data) == 0

    def test_search_and_suggestions_exclude_blocked_users(self, auth_client, user, other_user):
        """Valida que bloqueados não aparecem em buscas nem sugestões (Mútua)"""
        # 1. Bloqueio o usuário alvo
        Block.objects.create(blocker=user, blocked=other_user)
        
        # 2. Testar Busca (UserSearchView)
        search_url = f"{reverse('user-search')}?q={other_user.username}"
        search_response = auth_client.get(search_url)
        assert len(search_response.data) == 0
        
        # 3. Testar Sugestões (SuggestedFollowsView)
        suggest_url = reverse('suggested-follows')
        suggest_response = auth_client.get(suggest_url)
        # O other_user não deve estar na lista de sugestões
        usernames = [p['username'] for p in suggest_response.data]
        assert other_user.username not in usernames

    def test_user_can_still_see_own_profile(self, auth_client, user):
        """Garante que a filtragem de bloqueio não esconde o próprio perfil (Bug Fix)"""
        # Usamos o ID do profile para a URL (ajusta conforme a tua rota de detail)
        url = reverse('profile-detail', kwargs={'pk': user.profile.id})
        response = auth_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == user.username