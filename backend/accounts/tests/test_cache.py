# accounts/tests/test_cache.py - Versão simplificada

import pytest
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta
from accounts.models import User, Follow, Profile

@pytest.mark.django_db
class TestFollowCache:
    
    @pytest.fixture
    def setup_users(self):
        """Fixture local para criar usuários de teste"""
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
        user3 = User.objects.create_user(
            username='user3', 
            email='user3@test.com',
            password='testpass123'
        )
        return user1, user2, user3
    
    def test_followers_count_cache(self, setup_users):
        """Testa o cache de contagem de seguidores"""
        user1, user2, user3 = setup_users
        cache.clear()
        
        # Seguidores iniciais devem ser 0
        assert user1.get_followers_count() == 0
        assert user2.get_followers_count() == 0
        
        # user2 segue user1
        Follow.objects.create(follower=user2, following=user1)
        
        # Cache deve ser atualizado
        assert user1.get_followers_count() == 1
        assert user2.get_following_count() == 1
        
        # user3 segue user1
        Follow.objects.create(follower=user3, following=user1)
        
        # Cache deve ser atualizado
        assert user1.get_followers_count() == 2
    
    def test_following_count_cache(self, setup_users):
        """Testa o cache de contagem de seguindo"""
        user1, user2, user3 = setup_users
        cache.clear()
        
        # Seguindo inicial deve ser 0
        assert user1.get_following_count() == 0
        
        # user1 segue user2
        Follow.objects.create(follower=user1, following=user2)
        assert user1.get_following_count() == 1
        
        # user1 segue user3
        Follow.objects.create(follower=user1, following=user3)
        assert user1.get_following_count() == 2
    
    def test_cache_invalidated_on_unfollow(self, setup_users):
        """Testa que o cache é invalidado após unfollow"""
        user1, user2, _ = setup_users
        cache.clear()
        
        # Cria follow
        follow = Follow.objects.create(follower=user1, following=user2)
        assert user1.get_following_count() == 1
        assert user2.get_followers_count() == 1
        
        # Unfollow (soft delete)
        follow.unfollowed_at = timezone.now()
        follow.save()
        
        # Cache deve ser invalidado e contar 0
        assert user1.get_following_count() == 0
        assert user2.get_followers_count() == 0
    
    def test_cache_returns_same_value(self, setup_users):
        """Testa que o cache retorna o mesmo valor"""
        user1, user2, _ = setup_users
        cache.clear()
        
        # Primeira chamada - popula o cache
        count1 = user1.get_followers_count()
        
        # Segunda chamada - deve vir do cache
        count2 = user1.get_followers_count()
        
        assert count1 == count2