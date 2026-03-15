import pytest
from django.contrib.auth import authenticate, get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestUniversalBackend:
    """Testes para garantir que o login funciona por username, email e telefone."""

    @pytest.fixture(autouse=True)
    def _setup(self, settings):  # Adicionei settings aqui
        """Configura o backend e cria um usuário base."""
        # FORÇA o Django a usar o seu backend customizado durante este teste
        settings.AUTHENTICATION_BACKENDS = [
            "accounts.backends.UniversalBackend",
            "django.contrib.auth.backends.ModelBackend",
        ]

        password = "senha_segura_123"
        user = User.objects.create_user(
            username="cristiano",
            email="cris@test.com",
            phone="+5511999999999",
            password=password,
        )
        return user, password

    def test_authenticate_by_username(self, _setup):
        _, password = _setup
        user = authenticate(username="cristiano", password=password)
        assert user is not None
        assert user.username == "cristiano"

    def test_authenticate_by_email(self, _setup):
        _, password = _setup
        user = authenticate(username="cris@test.com", password=password)
        assert user is not None
        assert user.email == "cris@test.com"

    def test_authenticate_by_phone(self, _setup):
        _, password = _setup
        user = authenticate(username="+5511999999999", password=password)
        assert user is not None
        assert user.phone == "+5511999999999"

    def test_authenticate_case_insensitive(self, _setup):
        _, password = _setup
        user = authenticate(username="CRISTIANO", password=password)
        assert user is not None
        assert user.username == "cristiano"

    def test_authenticate_wrong_password(self, _setup):
        user = authenticate(username="cristiano", password="senha_errada")
        assert user is None

    def test_authenticate_non_existent_user(self, _setup):
        _, password = _setup
        user = authenticate(username="fantasma", password=password)
        assert user is None

    def test_authenticate_none_username(self, _setup):
        _, password = _setup
        user = authenticate(username=None, password=password)
        assert user is None
