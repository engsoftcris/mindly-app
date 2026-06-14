"""Testes de validação e integridade dos Serializers do app accounts."""

import pytest
from django.contrib.auth import get_user_model

from accounts.serializers import (
    PostSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)

User = get_user_model()


@pytest.mark.django_db
def test_register_serializer_creates_user_with_full_name_and_hashed_password():
    """Valida a criação de user e hash de senha via RegisterSerializer."""
    payload = {
        "username": "tester_serializer",
        "email": "serializer@test.com",
        "password": "senha_segura_123",
        "full_name": "Utilizador de Teste",
    }
    serializer = RegisterSerializer(data=payload)
    assert serializer.is_valid(), serializer.errors
    user = serializer.save()

    assert user.full_name == "Utilizador de Teste"
    assert user.check_password("senha_segura_123") is True


@pytest.mark.django_db
def test_register_serializer_duplicate_email_fails():
    """Garante que o serializer bloqueia emails já existentes."""
    User.objects.create_user(username="original", email="dup@test.com", password="123")
    payload = {
        "username": "outro",
        "email": "dup@test.com",
        "password": "password123",
        "full_name": "Outro User",
    }
    serializer = RegisterSerializer(data=payload)
    assert not serializer.is_valid()
    assert "email" in serializer.errors


@pytest.mark.django_db
def test_user_created_without_password_has_unusable_password():
    """Valida comportamento de usuários criados sem senha (ex: OAuth)."""
    user = User.objects.create_user(
        username="google_user", email="google@test.com", full_name="Google User"
    )
    assert not user.has_usable_password()
    assert user.password.startswith("!")


@pytest.mark.django_db
def test_profile_serializer_returns_default_avatar_for_pending_status():
    """Garante retorno do avatar padrão quando o status da imagem é PENDING."""
    # CORREÇÃO: Cria o usuário de forma limpa
    user = User.objects.create_user(username="photo_test", email="photo@test.com")

    # Garante/força que o Profile associado esteja com o status PENDING no cenário
    profile = user.profile
    profile.image_status = "PENDING"
    profile.save()

    serializer = UserProfileSerializer(instance=user)
    assert "default-avatar.png" in serializer.data["profile_picture"]


@pytest.mark.django_db
def test_post_serializer_read_only_fields():
    """Garante que campos ReadOnly como 'author' não sejam alterados via input."""
    User.objects.create_user(username="cristiano", email="c@test.com")
    payload = {
        "author": "hacker_name",
        "content": "Valid content",
    }
    serializer = PostSerializer(data=payload)
    serializer.is_valid()
    assert "author" not in serializer.validated_data
