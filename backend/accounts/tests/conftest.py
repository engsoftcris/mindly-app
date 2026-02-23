import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from accounts.models import Profile

User = get_user_model()

@pytest.fixture
def api_client():
    """Fixture básica para chamadas API"""
    return APIClient()

@pytest.fixture
def user(db):
    """Cria um usuário e garante que ele tem um perfil"""
    u = User.objects.create_user(
        username="testuser", 
        email="test@test.com", 
        password="password123"
    )
    # Se não tiveres um Signal para criar profile, criamos manualmente aqui
    Profile.objects.get_or_create(user=u)
    return u

@pytest.fixture
def auth_client(api_client, user):
    """Cliente já autenticado para testar endpoints privados"""
    api_client.force_authenticate(user=user)
    return api_client

from accounts.models import Post, User
@pytest.fixture
def post(db, user):
    """Cria um post de teste vinculado ao usuário da fixture user"""
    return Post.objects.create(
        user=user, 
        content="Conteúdo de teste para a TAL-16 🚀"
    )
@pytest.fixture
def user(db):
    return User.objects.create_user(username="testuser", email="test@test.com", password="password123")

@pytest.fixture
def other_user(db):
    return User.objects.create_user(username="other", email="other@test.com", password="password123")

@pytest.fixture
def post_to_report(user):
    return Post.objects.create(user=user, content="Post de teste")

