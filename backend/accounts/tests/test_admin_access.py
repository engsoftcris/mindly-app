import pytest
from django.urls import reverse

@pytest.mark.django_db
class TestAdminPermissions:
    
    def test_staff_user_can_access_admin(self, client, admin_user):
        """Verifica se o staff consegue acessar o painel."""
        client.force_login(admin_user)
        response = client.get(reverse('admin:index'))
        assert response.status_code == 200

    def test_regular_user_cannot_access_admin(self, client, user):
        """Verifica se o usuário comum recebe Forbidden no admin."""
        client.force_login(user)
        response = client.get(reverse('admin:index'))
        # No Django Admin, ele costuma redirecionar para o login (302) 
        # ou dar 403 dependendo da configuração.
        assert response.status_code in [302, 403]