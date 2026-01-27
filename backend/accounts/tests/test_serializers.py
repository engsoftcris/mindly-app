import pytest
from accounts.serializers import UserProfileSerializer, RegisterSerializer # Importa o RegisterSerializer
from .factories import UserFactory
from django.contrib.auth import get_user_model

User = get_user_model()

# --- Testes do RegisterSerializer (O que adicionámos agora) ---

@pytest.mark.django_db
def test_register_serializer_creates_user_with_full_name():
    """Garante que o registro salva o nome completo corretamente"""
    payload = {
        "username": "tester",
        "email": "tester@mindly.com",
        "password": "strong_password_123",
        "full_name": "Testador Oficial"
    }
    
    serializer = RegisterSerializer(data=payload)
    assert serializer.is_valid()
    
    user = serializer.save()
    
    assert user.username == "tester"
    assert user.full_name == "Testador Oficial"
    assert user.check_password("strong_password_123")

# --- Testes do UserProfileSerializer (Os que tu já tinhas) ---

@pytest.mark.django_db
def test_serializer_returns_default_image_when_status_is_pending():
    user = UserFactory(image_status="PENDING", profile_picture="profiles/test.jpg")
    serializer = UserProfileSerializer(instance=user)
    assert "default-avatar.png" in serializer.data["profile_picture"]
    assert "profiles/test.jpg" not in serializer.data["profile_picture"]

@pytest.mark.django_db
def test_serializer_returns_original_image_when_status_is_approved():
    user = UserFactory(image_status="APPROVED", profile_picture="profiles/test.jpg")
    serializer = UserProfileSerializer(instance=user)
    assert "profiles/test.jpg" in serializer.data["profile_picture"]