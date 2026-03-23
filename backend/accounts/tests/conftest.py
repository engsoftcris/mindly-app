import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from accounts.models import Post, Profile

User = get_user_model()

# pylint: disable=redefined-outer-name, unused-argument


@pytest.fixture
def api_client():
    """Fixture básica para chamadas API"""
    return APIClient()


@pytest.fixture
def user(db):
    """Cria um usuário e garante que ele tem um perfil"""
    u = User.objects.create_user(
        username="testuser", email="test@test.com", password="password123"
    )
    Profile.objects.get_or_create(user=u)
    return u


@pytest.fixture
def auth_client(api_client, user):
    """Cliente já autenticado para testar endpoints privados"""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def other_user(db):
    """Cria um segundo usuário para testes de interação"""
    return User.objects.create_user(
        username="other", email="other@test.com", password="password123"
    )


@pytest.fixture
def post(db, user):
    """Cria um post de teste vinculado ao usuário da fixture user"""
    return Post.objects.create(user=user, content="Conteúdo de teste para a TAL-16 🚀")


@pytest.fixture
def post_to_report(user):
    """Alias ou post específico para testes de denúncia"""
    return Post.objects.create(user=user, content="Post de teste")


@pytest.fixture
def banned_user(db):
    """Cria um usuário que já nasce banido"""
    return User.objects.create_user(
        username="banneduser",
        email="banned@test.com",
        password="password123",
        is_banned=True,
    )


@pytest.fixture
def user_b(db):
    """Usuário alvo para testes de perfil/bloqueio"""
    u = User.objects.create_user(
        username="target_user",
        email="target@test.com",
        password="password123",
        full_name="Target User",
    )
    Profile.objects.get_or_create(user=u)
    return u


@pytest.fixture
def user_b_profile(user_b):
    """Retorna o perfil do usuário alvo"""
    return user_b.profile
