import pytest
from django.urls import reverse
from rest_framework import status
from accounts.models import Post, User, Block, Profile

@pytest.mark.django_db
class TestHybridFeed:
    
    @pytest.fixture
    def setup_feed_data(self):
        # 1. Limpar dados residuais para evitar conflitos de Unique
        User.objects.all().delete()
        
        # 2. Criar usuários e garantir que tenham perfis
        me = User.objects.create_user(username="me", email="me@test.com")
        friend = User.objects.create_user(username="friend", email="f@test.com")
        stranger_pub = User.objects.create_user(username="pub", email="p@test.com")
        stranger_priv = User.objects.create_user(username="priv", email="pr@test.com")
        
        # 3. Configurar Privacidade nos Perfis (Usando get_or_create para segurança)
        p_friend, _ = Profile.objects.get_or_create(user=friend)
        p_friend.is_private = True
        p_friend.save()

        p_pub, _ = Profile.objects.get_or_create(user=stranger_pub)
        p_pub.is_private = False
        p_pub.save()

        p_priv, _ = Profile.objects.get_or_create(user=stranger_priv)
        p_priv.is_private = True
        p_priv.save()

        # Garantir que eu tenha um perfil público
        Profile.objects.get_or_create(user=me, is_private=False)
        
        # 4. Relacionamento: 'me' segue 'friend'
        me.following.add(friend)
        
        # 5. Criar Posts
        # Note que usamos IDs para garantir que estamos comparando as coisas certas
        post_me = Post.objects.create(user=me, content="Meu post")
        post_friend = Post.objects.create(user=friend, content="Post do amigo")
        post_pub = Post.objects.create(user=stranger_pub, content="Post público")
        post_priv = Post.objects.create(user=stranger_priv, content="Post privado")
        
        return me, post_me, post_friend, post_pub, post_priv

    def test_hybrid_feed_visibility(self, api_client, setup_feed_data):
        me, post_me, post_friend, post_pub, post_priv = setup_feed_data
        
        # Autenticação explícita
        api_client.force_authenticate(user=me)
        
        url = reverse('network-feed')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        
        # Pegamos os IDs dos posts que vieram no JSON
        results = response.data.get('results', response.data)
        posts_received_ids = [p['id'] for p in results]

        # DEBUG (Opcional: descomente se falhar para ver o que está vindo)
        # print(f"\nIDs Recebidos: {posts_received_ids}")
        # print(f"ID Amigo: {post_friend.id}, ID Pub: {post_pub.id}")

        # Asserts
        assert post_friend.id in posts_received_ids, "Deveria ver post de quem sigo (amigo)"
        assert post_pub.id in posts_received_ids, "Deveria ver post público de estranho"
        assert post_me.id not in posts_received_ids, "NÃO deveria ver meus próprios posts"
        assert post_priv.id not in posts_received_ids, "NÃO deveria ver post privado de quem não sigo"

    def test_feed_excludes_blocked_users(self, api_client, setup_feed_data):
        me, post_me, post_friend, post_pub, post_priv = setup_feed_data
        api_client.force_authenticate(user=me)
        
        # O estranho público me bloqueia
        Block.objects.create(blocker=post_pub.user, blocked=me)
        
        url = reverse('network-feed')
        response = api_client.get(url)
        
        results = response.data.get('results', response.data)
        posts_received_ids = [p['id'] for p in results]
        
        assert post_pub.id not in posts_received_ids, "Post de quem me bloqueou não deve aparecer"


    def test_suggested_follows_logic(self, api_client, setup_feed_data):
        me, post_me, post_friend, post_pub, post_priv = setup_feed_data
        api_client.force_authenticate(user=me)
        
        url = reverse('suggested-follows')
        response = api_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        
        # CONVERSÃO PARA STRING AQUI:
        suggested_ids = [str(s['id']) for s in response.data]
        
        friend_profile_id = str(post_friend.user.profile.id)
        pub_profile_id = str(post_pub.user.profile.id)
        priv_profile_id = str(post_priv.user.profile.id)
        my_profile_id = str(me.profile.id)

        # ASSERTS
        assert pub_profile_id in suggested_ids, "Deveria sugerir o usuário público que não sigo"
        assert friend_profile_id not in suggested_ids, "NÃO deveria sugerir quem eu já sigo"
        assert my_profile_id not in suggested_ids, "NÃO deveria sugerir a mim mesmo"
        assert priv_profile_id not in suggested_ids, "NÃO deveria sugerir perfis privados"

    def test_suggested_follows_excludes_blocked(self, api_client, setup_feed_data):
        """Garante que bloqueados não aparecem nas sugestões"""
        me, post_me, post_friend, post_pub, post_priv = setup_feed_data
        api_client.force_authenticate(user=me)
        
        # Bloquear o único cara que seria sugerido (o pub)
        Block.objects.create(blocker=me, blocked=post_pub.user)
        
        url = reverse('suggested-follows')
        response = api_client.get(url)
        
        suggested_ids = [s['id'] for s in response.data]
        assert post_pub.user.profile.id not in suggested_ids, "Usuário bloqueado não deve ser sugerido"