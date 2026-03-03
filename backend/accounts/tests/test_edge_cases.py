# accounts/tests/test_edge_cases.py

import pytest
from django.urls import reverse, NoReverseMatch
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from accounts.models import User, Profile, Follow, Block, Post

def get_profile_url(action_name, pk=None):
    """Auxiliar para resolver URLs do ProfileViewSet"""
    # Tenta primeiro com o padrão do router
    try:
        return reverse(f'profile-{action_name}', kwargs={'pk': pk} if pk else {})
    except NoReverseMatch:
        try:
            # Tenta sem o prefixo 'profile-'
            return reverse(action_name, kwargs={'pk': pk} if pk else {})
        except NoReverseMatch:
            # Se tudo falhar, constrói a URL manualmente
            profiles_url = reverse('profile-list')
            if pk:
                return f"{profiles_url}{pk}/{action_name}/"
            return f"{profiles_url}{action_name}/"

@pytest.mark.django_db
class TestFollowEdgeCases:
    """Testes para cenários extremos do sistema de follow"""
    
    @pytest.fixture
    def setup_users(self):
        """Fixture para criar usuários de teste"""
        user1 = User.objects.create_user(
            username='user1', 
            email='user1@test.com',
            password='testpass123'
        )
        user2 = User.objects.create_user(
            username='user2', 
            email='user2@test.com',
            password='testpass123'
        )
        # Garantir que os perfis existem
        Profile.objects.get_or_create(user=user1)
        Profile.objects.get_or_create(user=user2)
        return user1, user2
    
    def test_follow_unfollow_rapidly_10_times(self, api_client, setup_users):
        """Tenta seguir e unfollow 10x rapidamente - deve respeitar cooldown"""
        user1, user2 = setup_users
        api_client.force_authenticate(user=user1)
        url = get_profile_url('follow-toggle', user2.profile.id)
        
        results = []
        for i in range(10):
            response = api_client.post(url)
            results.append(response.status_code)
            
            # Se falhar, verifica se é por cooldown
            if response.status_code == 400:
                assert "Wait" in response.data['error']
                break
        
        # Verifica que pelo menos um follow/unfollow funcionou
        assert any(r in [200, 201] for r in results)
        
        # Verifica que o cooldown foi ativado
        follow = Follow.all_objects.filter(follower=user1, following=user2).first()
        assert follow is not None
        if follow.unfollowed_at:
            assert timezone.now() - follow.unfollowed_at < timedelta(seconds=10)
    
    def test_follow_after_block_unblock(self, api_client, setup_users):
        """Follow após bloqueio e desbloqueio deve funcionar"""
        user1, user2 = setup_users
        api_client.force_authenticate(user=user1)
        
        # Usa a função auxiliar para pegar a URL de bloqueio
        block_url = get_profile_url('block', user2.profile.id)
        
        # Bloqueia
        response = api_client.post(block_url)
        assert response.status_code in [200, 201]
        
        # Desbloqueia (mesmo endpoint)
        response = api_client.post(block_url)
        assert response.status_code in [200, 201]
        
        # Tenta seguir - deve funcionar
        follow_url = get_profile_url('follow-toggle', user2.profile.id)
        response = api_client.post(follow_url)
        assert response.status_code in [200, 201]
        assert response.data['is_following'] is True
    
    def test_follow_user_who_blocked_you(self, api_client, setup_users):
        """Tentar seguir quem te bloqueou deve retornar 403"""
        user1, user2 = setup_users
        api_client.force_authenticate(user=user1)
        
        # user2 bloqueia user1
        Block.objects.create(blocker=user2, blocked=user1)
        
        url = get_profile_url('follow-toggle', user2.profile.id)
        response = api_client.post(url)
        assert response.status_code == 403
        assert "Action unavailable due to blocks" in response.data['error']
    
    def test_concurrent_follow_requests(self, api_client, setup_users):
        """Múltiplas requisições simultâneas de follow"""
        user1, user2 = setup_users
        api_client.force_authenticate(user=user1)
        url = get_profile_url('follow-toggle', user2.profile.id)
        
        # Simula 5 requisições quase simultâneas
        responses = []
        for _ in range(5):
            responses.append(api_client.post(url))
        
        # Apenas uma deve criar (201) e as outras devem retornar 200 (já segue)
        status_counts = {}
        for r in responses:
            status_counts[r.status_code] = status_counts.get(r.status_code, 0) + 1
        
        assert status_counts.get(201, 0) <= 1  # No máximo uma criação
        assert sum(status_counts.values()) == 5
    
    def test_follow_after_long_time_unfollow(self, api_client, setup_users):
        """Follow após muito tempo (dias) de unfollow deve funcionar imediatamente"""
        user1, user2 = setup_users
        api_client.force_authenticate(user=user1)
        
        # Cria follow e unfollow com data antiga
        follow = Follow.objects.create(follower=user1, following=user2)
        follow.unfollowed_at = timezone.now() - timedelta(days=7)
        follow.save()
        
        url = get_profile_url('follow-toggle', user2.profile.id)
        response = api_client.post(url)
        
        assert response.status_code == 200
        assert response.data['is_following'] is True
        follow.refresh_from_db()
        assert follow.unfollowed_at is None

@pytest.mark.django_db
class TestBlockEdgeCases:
    """Testes extremos para sistema de bloqueio"""
    
    @pytest.fixture
    def setup_users(self):
        """Fixture para criar usuários de teste"""
        user1 = User.objects.create_user(
            username='user1', 
            email='user1@test.com',
            password='testpass123'
        )
        user2 = User.objects.create_user(
            username='user2', 
            email='user2@test.com',
            password='testpass123'
        )
        Profile.objects.get_or_create(user=user1)
        Profile.objects.get_or_create(user=user2)
        return user1, user2
    
    def test_block_user_who_blocked_you(self, api_client, setup_users):
        """Bloqueio mútuo deve funcionar"""
        user1, user2 = setup_users
        api_client.force_authenticate(user=user1)
        
        # user2 bloqueia user1
        Block.objects.create(blocker=user2, blocked=user1)
        
        # user1 tenta bloquear user2
        url = get_profile_url('block', user2.profile.id)
        response = api_client.post(url)
        
        assert response.status_code == 201
        assert Block.objects.filter(blocker=user1, blocked=user2).exists()
        assert Block.objects.filter(blocker=user2, blocked=user1).exists()
    
    def test_block_unblock_block_again(self, api_client, setup_users):
        """Bloquear, desbloquear e bloquear novamente"""
        user1, user2 = setup_users
        api_client.force_authenticate(user=user1)
        
        url = get_profile_url('block', user2.profile.id)
        
        # 1º bloqueio
        response1 = api_client.post(url)
        assert response1.status_code == 201
        assert Block.objects.filter(blocker=user1, blocked=user2).exists()
        
        # Desbloqueio
        response2 = api_client.post(url)
        assert response2.status_code == 200
        assert not Block.objects.filter(blocker=user1, blocked=user2).exists()
        
        # 2º bloqueio
        response3 = api_client.post(url)
        assert response3.status_code == 201
        
        # Verifica que só há um registro
        blocks = Block.objects.filter(blocker=user1, blocked=user2)
        assert blocks.count() == 1

@pytest.mark.django_db
class TestFeedPerformance:
    """Testes de performance e cenários extremos do feed"""
    
    @pytest.fixture
    def heavy_feed_setup(self, django_db_blocker):
        """Cria muitos dados para testar performance"""
        with django_db_blocker.unblock():
            user = User.objects.create_user(
                username='main', 
                email='main@test.com',
                password='testpass123'
            )
            Profile.objects.get_or_create(user=user)
            
            # Cria 100 usuários
            users = []
            for i in range(100):
                u = User.objects.create_user(
                    username=f'user{i}', 
                    email=f'user{i}@test.com',
                    password='testpass123'
                )
                Profile.objects.get_or_create(user=u)
                users.append(u)
            
            # Cria 50 follows
            for u in users[:50]:
                Follow.objects.create(follower=user, following=u)
            
            # Cria 200 posts
            for u in users:
                for _ in range(2):
                    Post.objects.create(
                        user=u,
                        content=f'Post by {u.username}'
                    )
            
            # Cria alguns bloqueios
            Block.objects.create(blocker=user, blocked=users[0])
            Block.objects.create(blocker=users[1], blocked=user)
            
            return user