"""Testes de integridade e validação dos modelos de conta e posts."""

import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from accounts.models import Post

User = get_user_model()


@pytest.mark.django_db
def test_user_creation_defaults_to_pending_status():
    """
    Garante que o perfil do novo usuário começa com status de imagem PENDING.
    """
    user = User.objects.create_user(
        username="testuser",
        full_name="Test User",
        password="password123",
        email="test@example.com",
    )
    # CORREÇÃO: O status da imagem de perfil fica dentro do objeto Profile
    assert user.profile.image_status == "PENDING"
    assert user.is_active is True


@pytest.mark.django_db
def test_post_content_length_validation():
    """
    Valida o limite de caracteres do post (estilo Twitter - 280 chars).
    """
    user = User.objects.create_user(username="tester2", email="test2@test.com")
    long_text = "x" * 281
    post = Post(user=user, content=long_text)
    with pytest.raises(ValidationError):
        post.full_clean()
        # Nota: O save() não é necessário aqui pois o full_clean já lança o erro
