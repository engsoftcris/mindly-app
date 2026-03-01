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
def test_admin_can_approve_photos_in_bulk(admin_client):
    # 1. Criamos os usuários (o Profile é criado via signal)
    u1 = User.objects.create_user(username='u1', email='u1@t.com', full_name='U1')
    u2 = User.objects.create_user(username='u2', email='u2@t.com', full_name='U2')

    # 2. Pegamos os profiles e colocamos como PENDING
    p1 = u1.profile
    p2 = u2.profile
    p1.image_status = 'PENDING'
    p2.image_status = 'PENDING'
    p1.save()
    p2.save()

    # MUDANÇA AQUI: A URL agora é do changelist do PROFILE, não do USER
    url = reverse('admin:accounts_profile_changelist')
    
    # MUDANÇA AQUI: O nome da action agora é 'approve_photos'
    data = {
        'action': 'approve_photos',
        '_selected_action': [p1.id, p2.id],
    }
    
    response = admin_client.post(url, data, follow=True)

    # 3. Atualizamos do banco
    p1.refresh_from_db()
    p2.refresh_from_db()

    assert response.status_code == 200
    assert p1.image_status == 'APPROVED'
    assert p2.image_status == 'APPROVED'