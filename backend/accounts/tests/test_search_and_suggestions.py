import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from accounts.models import Profile
from django.urls import reverse

User = get_user_model()

# --- FIXTURES ---

@pytest.fixture
def api_client():
    """Cria um cliente para fazer requisições à API"""
    return APIClient()

@pytest.fixture
def setup_users(db):
    """
    Cria o cenário de teste com emails:
    """
    # 1. Tu (Cristiano)
    me = User.objects.create_user(
        username='cristiano', 
        email='cristiano@mindly.com', 
        password='password123'
    )
    Profile.objects.get_or_create(user=me)
    
    # 2. Juliet (Sugestão Válida)
    juliet = User.objects.create_user(
        username='juliet', 
        full_name='Juliet Bennett', 
        email='juliet@gmail.com', 
        password='password123'
    )
    Profile.objects.get_or_create(user=juliet)
    
    # 3. Admin (O que deve ser escondido)
    admin = User.objects.create_superuser(
        username='admin', 
        email='admin@mindly.com', 
        password='password123'
    )
    Profile.objects.get_or_create(user=admin)
    
    return me, juliet, admin


# --- TESTES ---

@pytest.mark.django_db
class TestSearchAndSuggestions:

    def test_suggestions_logic(self, api_client, setup_users):
        """TESTE 1: Garante que as sugestões ignoram o admin e você mesmo"""
        me, juliet, admin = setup_users
        api_client.force_authenticate(user=me)
        
        url = reverse('suggested-follows')
        response = api_client.get(url)
        
        assert response.status_code == 200
        
        # Pegamos os usernames da lista de sugestões
        usernames = []
        for item in response.data:
            if 'user' in item and isinstance(item['user'], dict):
                usernames.append(item['user'].get('username'))
            else:
                usernames.append(item.get('username'))

        assert 'juliet' in usernames
        assert 'admin' not in usernames
        assert 'cristiano' not in usernames

    def test_search_finds_juliet(self, api_client, setup_users):
        """TESTE 2: Testa se a busca encontra a Juliet"""
        me, juliet, admin = setup_users
        api_client.force_authenticate(user=me)
        
        url = reverse('user-search') + "?q=juliet"
        response = api_client.get(url)
        
        assert response.status_code == 200
        assert len(response.data) > 0
        
        primeiro = response.data[0]
        username = primeiro['user'].get('username') if 'user' in primeiro else primeiro.get('username')
        assert username == 'juliet'

    def test_search_security_admin_filter(self, api_client, setup_users):
        """TESTE 3: Garante que o Admin não aparece na busca"""
        me, juliet, admin = setup_users
        api_client.force_authenticate(user=me)
        
        url = reverse('user-search') + "?q=admin"
        response = api_client.get(url)
        
        assert response.status_code == 200
        assert len(response.data) == 0
        assert len(response.data) == 0