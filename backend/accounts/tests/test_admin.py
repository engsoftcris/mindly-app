"""Testes para a interface administrativa do Django e ações customizadas."""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

User = get_user_model()

# pylint: disable=redefined-outer-name


@pytest.fixture(autouse=True)
def disable_static_storage(settings):
    """Desativa restrições de arquivos estáticos durante os testes de admin."""
    settings.STATICFILES_STORAGE = (
        "django.contrib.staticfiles.storage.StaticFilesStorage"
    )
    settings.WHITENOISE_MANIFEST_STRICT = False


@pytest.mark.django_db
def test_user_common_cannot_access_admin(client):
    """Garante que utilizadores sem privilégios sejam redirecionados do admin."""
    User.objects.create_user(
        username="comum", email="c@t.com", full_name="Comum", password="123"
    )
    client.login(username="comum", password="123")
    url = reverse("admin:accounts_user_changelist")
    response = client.get(url)
    assert response.status_code == 302


@pytest.mark.django_db
def test_admin_can_approve_photos_in_bulk(admin_client):
    """Testa a Action de aprovação de fotos em massa no Admin."""
    # 1. Criamos os usuários (o Profile é gerado via signals)
    u1 = User.objects.create_user(username="u1", email="u1@t.com", full_name="U1")
    u2 = User.objects.create_user(username="u2", email="u2@t.com", full_name="U2")

    # 2. Acedemos aos perfis e definimos como PENDING
    p1 = u1.profile
    p2 = u2.profile

    # CORREÇÃO MYPY: Garantir que os perfis não são None
    assert p1 is not None
    assert p2 is not None

    p1.image_status = "PENDING"
    p2.image_status = "PENDING"
    p1.save()
    p2.save()

    url = reverse("admin:accounts_profile_changelist")

    # Enviando a action para os IDs dos perfis
    data = {
        "action": "approve_photos",
        "_selected_action": [p1.id, p2.id],
    }

    response = admin_client.post(url, data, follow=True)

    # 3. Validamos a atualização no banco de dados
    p1.refresh_from_db()
    p2.refresh_from_db()

    assert response.status_code == 200
    assert p1.image_status == "APPROVED"
    assert p2.image_status == "APPROVED"
