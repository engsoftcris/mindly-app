import pytest
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from accounts.models import Post, Profile

User = get_user_model()

@pytest.mark.django_db
def test_outsider_cannot_see_private_profile_posts(api_client):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    # 1. Criar Utilizador A (Privado)
    user_a = User.objects.create_user(username="private_user", email="a@test.com", password="123")
    profile_a = user_a.profile
    profile_a.is_private = True
    profile_a.save()
    
    # Criar um post para ele
    from accounts.models import Post
    Post.objects.create(user=user_a, content="Secret content")

    # 2. Criar Utilizador B (Visitante)
    user_b = User.objects.create_user(username="visitor", email="b@test.com", password="123")
    api_client.force_authenticate(user=user_b)

    # 3. Tentar aceder ao perfil usando REVERSE (agora deve funcionar)
    # Se der erro de NoReverseMatch, use o caminho manual:
    try:
        url = reverse('profile-detail', kwargs={'pk': profile_a.pk})
    except:
        url = f"/api/accounts/profiles/{profile_a.pk}/"
    
    response = api_client.get(url)

    # Asserts
    assert response.status_code == 200
    assert response.data['is_private'] is True
    # O to_representation do Serializer deve ter removido os posts
    assert len(response.data.get('posts', [])) == 0
    assert response.data.get('is_restricted') is True

@pytest.mark.django_db
def test_follower_can_see_private_profile_posts(api_client):
    from django.contrib.auth import get_user_model
    from accounts.models import Post
    User = get_user_model()

    # 1. Criar Utilizador A (Privado)
    user_a = User.objects.create_user(username="star", email="star@test.com", password="123")
    profile_a = user_a.profile
    profile_a.is_private = True
    profile_a.save()
    
    # GARANTIA: Criar o post e dar um refresh no user
    Post.objects.create(user=user_a, content="Conteúdo VIP")
    user_a.refresh_from_db() 

    # 2. Criar Utilizador B e fazê-lo SEGUIR o A
    user_b = User.objects.create_user(username="follower", email="f@test.com", password="123")
    user_b.following.add(user_a) 
    api_client.force_authenticate(user=user_b)

    # 3. Ver o perfil
    url = f"/api/accounts/profiles/{profile_a.id}/"
    response = api_client.get(url)

    # DEBUG: Se falhar de novo, esse print vai te mostrar o que está vindo
    if response.status_code != 200 or len(response.data.get('posts', [])) == 0:
        print("\nDEBUG DATA:", response.data)

    assert response.status_code == 200
    assert len(response.data.get('posts', [])) > 0 # <--- O erro está aqui!