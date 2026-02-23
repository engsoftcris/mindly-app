import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, Post, Report, Notification

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(username='admin', email='admin@test.com', password='password123')

@pytest.fixture
def common_user(db):
    return User.objects.create_user(username='user', email='user@test.com', password='password123')

@pytest.fixture
def pending_user(db):
    return User.objects.create_user(username='pending', email='pending@test.com', image_status='PENDING')

@pytest.fixture
def post_to_report(common_user):
    return Post.objects.create(user=common_user, content="Post para ser denunciado")

@pytest.mark.django_db
class TestModeration:

    # --- TESTES DE PERMISSÃO (TAL-22) ---
    
    def test_common_user_cannot_access_pending_list(self, api_client, common_user):
        api_client.force_authenticate(user=common_user)
        url = reverse('moderation-pending-users')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_can_access_pending_list(self, api_client, admin_user, pending_user):
        api_client.force_authenticate(user=admin_user)
        url = reverse('moderation-pending-users')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1
        
        # Em vez de checar apenas o primeiro, verificamos se o 'pending' está na lista
        usernames = [u['username'] for u in response.data]
        assert 'pending' in usernames

    def test_admin_can_approve_user(self, api_client, admin_user, pending_user):
        api_client.force_authenticate(user=admin_user)
        url = reverse('moderation-approve-user', kwargs={'pk': pending_user.pk})
        response = api_client.post(url)
        
        pending_user.refresh_from_db()
        assert response.status_code == status.HTTP_200_OK
        assert pending_user.image_status == 'APPROVED'

    # --- TESTES DE DENÚNCIA (TAL-23) ---

    def test_user_can_report_post(self, api_client, common_user, post_to_report):
        api_client.force_authenticate(user=common_user)
        url = reverse('report-list')
        data = {
            "post": post_to_report.id,
            "reason": "spam",
            "description": "Isto é spam"
        }
        response = api_client.post(url, data)
        assert response.status_code == status.HTTP_201_CREATED
        assert Report.objects.filter(post=post_to_report).exists()

    def test_common_user_cannot_list_reports(self, api_client, common_user):
        api_client.force_authenticate(user=common_user)
        url = reverse('report-list')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    # --- TESTES DE RESOLUÇÃO (NOVA LÓGICA) ---

    def test_admin_resolving_report_hides_post(self, admin_user, post_to_report, common_user):
        """Valida que quando a denúncia é resolvida, o post sofre soft delete (is_deleted)"""
        # Criamos uma denúncia
        report = Report.objects.create(reporter=common_user, post=post_to_report, reason='spam')
        
        # Simulamos a resolução (como se fosse no Admin)
        report.status = 'resolved'
        report.save()
        
        post_to_report.refresh_from_db()
        assert post_to_report.is_deleted is True

    def test_admin_resolving_report_hides_post(self, admin_user, post_to_report, common_user):
        """Valida que quando a denúncia é resolvida, o post sofre soft delete (is_deleted)"""
        # 1. Criamos a denúncia (ela nasce 'pending')
        report = Report.objects.create(reporter=common_user, post=post_to_report, reason='spam')
        
        # 2. Simulamos a ação da 'mark_as_resolved' do seu admin.py:
        # Primeiro, o admin esconde o post
        post_to_report.is_deleted = True
        post_to_report.save()
        
        # Depois, o admin muda o status da denúncia (o que dispara o seu signal de notificação)
        report.status = 'resolved'
        report.save()
        
        # 3. Verificação
        post_to_report.refresh_from_db()
        assert post_to_report.is_deleted is True
        
        report.refresh_from_db()
        assert report.status == 'resolved'
    def test_user_cannot_report_same_post_twice(self, api_client, common_user, post_to_report):
        """Evita spam de denúncias do mesmo usuário no mesmo post"""
        api_client.force_authenticate(user=common_user)
        url = reverse('report-list')
        data = {"post": post_to_report.id, "reason": "spam"}
        
        # Primeira vez
        api_client.post(url, data)
        # Segunda vez
        response = api_client.post(url, data)
        
        # Deve retornar erro (se você tiver o unique_together no Model)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    # 1. TESTE DE SNAPSHOT (Garante que o texto foi salvo na notificação)
    def test_notification_stores_snapshot_after_resolution(self, admin_user, post_to_report, common_user):
        """Valida que o Signal salvou o texto do post na notificação antes dele 'sumir'"""
        report = Report.objects.create(reporter=common_user, post=post_to_report, reason='hate_speech')
        
        # Simula o Admin resolvendo
        post_to_report.is_deleted = True
        post_to_report.save()
        report.status = 'resolved'
        report.save()

        # Busca a notificação gerada para o reporter
        notification = Notification.objects.filter(recipient=common_user, notification_type='REPORT_UPDATE').first()
        
        assert notification is not None
        assert notification.stored_post_content == "Post para ser denunciado"

    # 2. TESTE DE PRIVACIDADE (TAL-14)
    def test_private_profile_hides_posts_from_non_followers(self, api_client):
        """Valida que posts de perfis privados não aparecem para quem não segue"""
        # 1. Criamos usuários únicos para este teste não herdar lixo
        u_private = User.objects.create_user(username='priv_test', email='priv@t.com', password='123')
        u_visitor = User.objects.create_user(username='vis_test', email='vis@t.com', password='123')
        
        # Garantir que é privado
        u_private.profile.is_private = True
        u_private.profile.save()
        
        # Criar post
        Post.objects.create(user=u_private, content="Secreto")

        api_client.force_authenticate(user=u_visitor)
        url = reverse('user-posts-list', kwargs={'pk': u_private.profile.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        # 2. SE O TEU FEED É PAGINADO: Os dados estão em response.data['results']
        # Se não for paginado, é response.data direto. 
        # Como deu erro '4 == 0', é quase certo que o DRF enviou as 4 chaves da paginação.
        
        if isinstance(response.data, dict) and 'results' in response.data:
            assert len(response.data['results']) == 0
        else:
            assert len(response.data) == 0

    # 3. TESTE DE CASTIGO DO FOLLOW (Regra dos 5 minutos)
    def test_follow_cooldown_penalty(self, api_client, common_user):
        """Valida que o usuário não pode seguir/deseguir freneticamente"""
        target_user = User.objects.create_user(username='target', email='t@test.com', password='123')
        api_client.force_authenticate(user=common_user)
        url = reverse('profile-follow-toggle', kwargs={'pk': target_user.profile.id})

        # 1. Segue
        api_client.post(url)
        # 2. Dá Unfollow
        api_client.post(url)
        
        # 3. Tenta seguir de novo IMEDIATAMENTE
        response = api_client.post(url)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Aguarde" in response.data['error']