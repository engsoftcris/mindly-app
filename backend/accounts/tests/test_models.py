import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_user_creation_defaults_to_pending_status():
    # Criamos um usuário sem especificar o status
    user = User.objects.create_user(
        username="testuser", full_name="Test User", password="password123", email="test@example.com"
    )

    # Verificamos se o status é PENDING
    assert user.image_status == "PENDING"
    assert user.is_active is True
