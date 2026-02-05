import pytest
from django.contrib.auth import get_user_model
from accounts.serializers import PostSerializer, RegisterSerializer
from accounts.serializers import UserProfileSerializer

User = get_user_model()

@pytest.mark.django_db
def test_register_serializer_creates_user_with_full_name_and_hashed_password():
    payload = {
        "username": "tester_serializer",
        "email": "serializer@test.com",
        "password": "senha_segura_123",
        "full_name": "Utilizador de Teste"
    }
    
    serializer = RegisterSerializer(data=payload)
    assert serializer.is_valid(), serializer.errors
    user = serializer.save()
    
    # DEBUG PRINTS
    print(f"\nDEBUG - Senha gravada no banco: {user.password}")
    print(f"\nDEBUG - check_password result: {user.check_password('senha_segura_123')}")

    assert user.full_name == "Utilizador de Teste"
    assert user.check_password("senha_segura_123") is True

@pytest.mark.django_db
def test_register_serializer_duplicate_email_fails():
    # Criamos o primeiro utilizador
    User.objects.create_user(username="original", email="dup@test.com", password="123")
    
    # Tentamos registar outro com o mesmo email via Serializer
    payload = {
        "username": "outro",
        "email": "dup@test.com", # Email duplicado
        "password": "password123",
        "full_name": "Outro User"
    }
    serializer = RegisterSerializer(data=payload)
    
    assert not serializer.is_valid()
    assert "email" in serializer.errors

@pytest.mark.django_db
def test_user_created_without_password_has_unusable_password():
    # Simula o fluxo do Google (sem passar password)
    user = User.objects.create_user(
        username="google_user",
        email="google@test.com",
        full_name="Google User"
    )
    
    assert not user.has_usable_password()
    assert user.password.startswith('!') # O prefixo de segurança do Django

@pytest.mark.django_db
def test_profile_serializer_returns_default_avatar_for_pending_status():
    user = User.objects.create_user(
        username="photo_test",
        email="photo@test.com",
        image_status="PENDING"
    )
    serializer = UserProfileSerializer(instance=user)
    
    # Verifica se a URL contém o avatar padrão
    assert "default-avatar.png" in serializer.data["profile_picture"]

@pytest.mark.django_db
def test_post_serializer_read_only_fields():
    user = User.objects.create_user(username="cristiano", email="c@test.com")
    payload = {
        "author": "hacker_name", # Trying to fake the author field
        "content": "Valid content"
    }
    serializer = PostSerializer(data=payload)
    serializer.is_valid()
    # The 'author' should be ignored because it is ReadOnly in the Serializer Meta
    assert "author" not in serializer.validated_data