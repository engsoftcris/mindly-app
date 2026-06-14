# pylint: disable=attribute-defined-outside-init
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from accounts.models import User
from accounts.serializers import GoogleRegisterSerializer


@pytest.mark.django_db
class TestLoginAndRegistrationFlows:

    @pytest.fixture(autouse=True)
    def setup_method(self):
        self.client = APIClient()
        self.password = "SenhaSegura123!"

        # Cria o usuário padrão local para os testes de login
        self.user = User.objects.create_user(
            username="cris_dev",
            email="cris.local@mindly.com",
            password=self.password,
            full_name="Cristiano Dev",
        )
        self.login_url = "/api/accounts/login/"

    def test_login_with_username_success(self):
        """Testa o login tradicional usando o username"""
        data = {"username": "cris_dev", "password": self.password}
        response = self.client.post(self.login_url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert response.data["user"]["username"] == "cris_dev"

    def test_login_fields_returned(self):
        """Testa se o payload de retorno do login traz os dados mapeados no UserProfileSerializer"""
        data = {"username": "cris_dev", "password": self.password}
        response = self.client.post(self.login_url, data, format="json")

        assert response.status_code == status.HTTP_200_OK
        assert "user" in response.data
        assert response.data["user"]["username"] == "cris_dev"
        assert response.data["user"]["full_name"] == "Cristiano Dev"

    def test_google_serializer_registration_flow(self):
        """Testa diretamente o GoogleRegisterSerializer simulando o retorno do Gmail/Google"""

        gmail_payload = {
            "username": "Cristiano Gmail",
            "email": "cristiano.teste@gmail.com",
            "full_name": "Cristiano Silva",
            "social_id": "google_oauth_unique_id_12345",
        }

        serializer = GoogleRegisterSerializer(data=gmail_payload)
        assert serializer.is_valid(), serializer.errors
        user = serializer.save()

        assert user.email == "cristiano.teste@gmail.com"
        assert user.provider == "google"
        assert user.social_id == "google_oauth_unique_id_12345"
        assert user.username == "cristiano_gmail"
        assert not user.has_usable_password()

    def test_google_registration_fails_if_email_exists(self):
        """Garante que o registro via Google falha se o e-mail já estiver cadastrado no sistema"""

        duplicated_payload = {
            "username": "OutroNome",
            "email": "cris.local@mindly.com",
            "full_name": "Qualquer Nome",
            "social_id": "google_99999",
        }

        serializer = GoogleRegisterSerializer(data=duplicated_payload)
        assert not serializer.is_valid()
        assert "email" in serializer.errors

    def test_change_password_local_user_success(self):
        """Testa a alteração de senha com sucesso para um usuário local"""
        url_change_password = "/api/accounts/change-password/"
        self.client.force_authenticate(user=self.user)

        payload = {
            "current_password": self.password,
            "new_password": "NovaSenhaSuperSegura123!",
        }

        response = self.client.post(url_change_password, payload, format="json")
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_204_NO_CONTENT]

        self.user.refresh_from_db()
        assert self.user.check_password("NovaSenhaSuperSegura123!")

    def test_change_password_google_user_allowed(self):
        """Garante que um usuário do Google consegue definir uma senha local usando a chave correta"""
        google_user = User.objects.create_user(
            username="cris_google_test",
            email="cris.google.test@gmail.com",
            full_name="Cristiano Google Teste",
            provider="google",
        )
        google_user.set_unusable_password()
        google_user.save()

        url_change_password = "/api/accounts/change-password/"
        self.client.force_authenticate(user=google_user)

        payload = {"current_password": "", "new_password": "NovaSenhaDoGoogle123!"}

        response = self.client.post(url_change_password, payload, format="json")
        assert response.status_code == status.HTTP_200_OK

        google_user.refresh_from_db()
        assert google_user.check_password("NovaSenhaDoGoogle123!")

    def test_registration_fails_with_weak_password(self):
        """Garante que a criação de usuário falha se a senha violar as regras do Django"""
        url_register = "/api/accounts/register/"

        payload = {
            "username": "novo_user_teste",
            "email": "novo_user@mindly.com",
            "password": "123",  # Senha fraca
            "full_name": "Novo Usuario Teste",
        }

        response = self.client.post(url_register, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.data or "error" in response.data

    def test_change_password_fails_with_weak_password(self):
        """Garante que a troca de senha falha se a nova senha for fraca"""
        url_change_password = "/api/accounts/change-password/"
        self.client.force_authenticate(user=self.user)

        payload = {
            "current_password": self.password,
            "new_password": "abc",  # Senha fraca
        }

        response = self.client.post(url_change_password, payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "new_password" in response.data or "error" in response.data

    def test_workflow_register_and_then_change_password(self):
        """Testa o fluxo completo: cria uma conta local e, em seguida, altera a senha com sucesso"""
        # 1. Cadastro do novo usuário
        url_register = "/api/accounts/register/"
        registration_payload = {
            "username": "usuario_novo_fluxo",
            "email": "novo_fluxo@mindly.com",
            "password": "SenhaInicialForte123!",
            "full_name": "Usuario Novo Fluxo",
        }

        register_response = self.client.post(
            url_register, registration_payload, format="json"
        )
        assert register_response.status_code == status.HTTP_201_CREATED

        # 2. Busca o usuário recém-criado no banco para podermos autenticá-lo no cliente de teste
        new_user = User.objects.get(username="usuario_novo_fluxo")
        self.client.force_authenticate(user=new_user)

        # 3. Alteração da senha recém-criada
        url_change_password = "/api/accounts/change-password/"
        change_password_payload = {
            "current_password": "SenhaInicialForte123!",
            "new_password": "NovaSenhaAindaMaisForte456!",
        }

        change_response = self.client.post(
            url_change_password, change_password_payload, format="json"
        )

        # Valida se o backend aceitou a troca
        assert change_response.status_code in [
            status.HTTP_200_OK,
            status.HTTP_204_NO_CONTENT,
        ]

        # 4. Garante que a senha antiga NÃO funciona mais e a nova funciona perfeitamente
        new_user.refresh_from_db()
        assert not new_user.check_password("SenhaInicialForte123!")
        assert new_user.check_password("NovaSenhaAindaMaisForte456!")
