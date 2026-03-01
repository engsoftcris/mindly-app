import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from unittest import mock

User = get_user_model()

@pytest.mark.django_db
def test_banned_user_cannot_login(api_client, user):
    # 1. Definimos um motivo específico para testar
    user.is_banned = True
    user.ban_reason = "Spam excessivo"
    user.save()
    
    url = reverse('token_obtain_pair') 
    data = {"username": user.username, "password": "password123"}
    
    response = api_client.post(url, data)
    
    # 2. Verificações atualizadas
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert response.data['detail'] == "Sua conta foi suspensa."
    # NOVO: Validar se o motivo que escrevemos voltou na resposta
    assert response.data['ban_reason'] == "Spam excessivo"

@pytest.mark.django_db
def test_active_session_is_blocked_after_ban(api_client, user):
    # 1. Login para obter token
    login_url = reverse('token_obtain_pair')
    login_res = api_client.post(login_url, {"username": user.username, "password": "password123"})
    token = login_res.data['access']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    # 2. Banimos com um motivo
    user.is_banned = True
    user.ban_reason = "Uso de bots"
    user.save()

    # 3. Tenta aceder a qualquer rota protegida
    url = reverse('post-list')
    response = api_client.get(url)
    print("STATUS:", response.status_code)
    print("DATA:", response.data)
    print("RAW:", getattr(response, "content", b"")[:500])
    
    assert response.status_code == status.HTTP_403_FORBIDDEN
    # NOVO: Validar se o Middleware/AuthSafe também envia o motivo
    assert response.data['ban_reason'] == "Uso de bots"

@pytest.mark.django_db
def test_unbanned_user_regains_access(api_client, user):
    user.is_banned = True
    user.save()
    
    login_url = reverse('token_obtain_pair')
    data = {"username": user.username, "password": "password123"}
    assert api_client.post(login_url, data).status_code == status.HTTP_403_FORBIDDEN

    user.is_banned = False
    user.save()

    response = api_client.post(login_url, data)
    assert response.status_code == status.HTTP_200_OK
    assert 'access' in response.data

@pytest.mark.django_db
def test_banned_user_posts_disappear_from_feed(api_client, user):
    from accounts.models import Post
    
    other_user = User.objects.create_user(
        username="observador", 
        password="password123",
        email="obs@teste.com",
        full_name="Observador de Teste"
    )
    api_client.force_authenticate(user=other_user)

    Post.objects.create(user=user, content="Post do futuro banido")

    feed_url = reverse('post-list')
    response = api_client.get(feed_url)
        
    results = response.data if isinstance(response.data, list) else response.data.get('results', [])
   
    assert len(results) >= 1

    user.is_banned = True
    user.save()

    response = api_client.get(feed_url)
    results_after = response.data if isinstance(response.data, list) else response.data.get('results', [])
    assert len(results_after) == 0

@pytest.mark.django_db
def test_admin_action_ban_multiple_users():
    from accounts.admin import CustomUserAdmin
    from django.contrib.admin.sites import AdminSite
    from django.test import RequestFactory
    
    admin_user = User.objects.create_superuser(username="admin", password="password123", email="admin@test.com")
    u1 = User.objects.create_user(username="bot1", password="password123", email="bot1@t.com", full_name="Bot 1")
    u2 = User.objects.create_user(username="bot2", password="password123", email="bot2@t.com", full_name="Bot 2")

    ma = CustomUserAdmin(User, AdminSite())
    rf = RequestFactory()
    request = rf.get('/')
    request.user = admin_user

    with mock.patch.object(CustomUserAdmin, 'message_user') as mock_message:
        queryset = User.objects.filter(username__in=["bot1", "bot2", "admin"])
        ma.ban_selected_users(request, queryset)

    u1.refresh_from_db()
    u2.refresh_from_db()
    admin_user.refresh_from_db()

    assert u1.is_banned is True
    assert u2.is_banned is True
    assert admin_user.is_banned is False
    # Valida se a action em massa está a definir o motivo corretamente
    assert u1.ban_reason == "Banimento via Admin."