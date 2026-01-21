import pytest
from accounts.serializers import UserProfileSerializer
from .factories import UserFactory

@pytest.mark.django_db
def test_serializer_returns_default_image_when_status_is_pending():
    # Usuário com foto, mas status PENDING
    user = UserFactory(image_status="PENDING", profile_picture="profiles/test.jpg")
    serializer = UserProfileSerializer(instance=user)
    
    # A URL NÃO deve conter a foto original, mas sim o fallback
    assert "default-avatar.png" in serializer.data["profile_picture"]
    assert "profiles/test.jpg" not in serializer.data["profile_picture"]

@pytest.mark.django_db
def test_serializer_returns_original_image_when_status_is_approved():
    # Usuário com foto e status APPROVED
    user = UserFactory(image_status="APPROVED", profile_picture="profiles/test.jpg")
    serializer = UserProfileSerializer(instance=user)
    
    # Deve retornar a URL da foto
    assert "profiles/test.jpg" in serializer.data["profile_picture"]