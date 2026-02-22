import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User, Post, Report

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