import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model
from accounts.models import Profile # Importamos o Profile

User = get_user_model()

@pytest.fixture(autouse=True)
def disable_static_storage(settings):
    settings.STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'
    settings.WHITENOISE_MANIFEST_STRICT = False

@pytest.mark.django_db
def test_user_common_cannot_access_admin(client):
    User.objects.create_user(
        username='comum', email='c@t.com', full_name='Comum', password='123'
    )
    client.login(username='comum', password='123')
    url = reverse('admin:accounts_user_changelist')
    response = client.get(url)
    assert response.status_code == 302

@pytest.mark.django_db
def test_admin_can_approve_images_in_bulk(admin_client):
    # 1. Criamos os usuários sem o image_status (que não pertence mais ao User)
    u1 = User.objects.create_user(username='u1', email='u1@t.com', full_name='U1')
    u2 = User.objects.create_user(username='u2', email='u2@t.com', full_name='U2')

    # 2. Garantimos que o status no Profile seja PENDING (usando a sua property nova)
    u1.image_status = 'PENDING'
    u2.image_status = 'PENDING'
    u1.save()
    u2.save()

    url = reverse('admin:accounts_user_changelist')
    
    # A action no admin provavelmente atua sobre o modelo User
    data = {
        'action': 'approve_images',
        '_selected_action': [u1.id, u2.id],
    }
    
    response = admin_client.post(url, data, follow=True)

    # 3. Atualizamos do banco
    u1.refresh_from_db()
    u2.refresh_from_db()

    assert response.status_code == 200
    # Verificamos via property (que busca no Profile)
    assert u1.image_status == 'APPROVED'
    assert u2.image_status == 'APPROVED'
    assert "aprovados" in response.content.decode('utf-8').lower()