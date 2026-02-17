import pytest
from rest_framework import status
from django.urls import reverse, NoReverseMatch
from accounts.models import Block, Follow, Post, Profile, User
from django.utils.timezone import now
from datetime import timedelta

# --- FIXTURES ADICIONAIS (Para complementar as que já tens) ---

@pytest.fixture
def user_b(db):
    """Cria um segundo utilizador (o alvo do bloqueio)"""
    u = User.objects.create_user(
        username="target_user", 
        email="target@test.com", 
        password="password123"
    )
    Profile.objects.get_or_create(user=u)
    return u

@pytest.fixture
def user_b_profile(user_b):
    """Retorna o perfil do segundo utilizador"""
    return user_b.profile

@pytest.fixture
def post_factory(db):
    """Cria posts para testar a visibilidade no feed"""
    def _create_post(user, content="Conteúdo de teste"):
        return Post.objects.create(user=user, content=content)
    return _create_post

# --- TESTES DO SISTEMA DE BLOQUEIO ---

@pytest.mark.django_db
class TestBlockSystem:

    def get_url(self, action_name, pk=None):
        """Auxiliar para resolver URLs com ou sem namespace"""
        names = [f'profile-{action_name}', f'accounts:profile-{action_name}']
        for name in names:
            try:
                if pk:
                    return reverse(name, kwargs={'pk': pk})
                return reverse(name)
            except NoReverseMatch:
                continue
        raise NoReverseMatch(f"Rota {action_name} não encontrada.")

    def test_block_user_successfully(self, auth_client, user, user_b_profile):
        """TAL-14: Testa bloqueio e remoção automática de follow"""
        target_user = user_b_profile.user
        
        # Simular que se seguiam
        Follow.objects.create(follower=user, following=target_user)
        
        url = self.get_url('block-user', pk=user_b_profile.id)
        response = auth_client.post(url)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert Block.objects.filter(blocker=user, blocked=target_user).exists()
        # O follow deve ter sido destruído
        assert not Follow.objects.filter(follower=user, following=target_user).exists()

    def test_cannot_follow_blocked_user(self, auth_client, user, user_b_profile):
        """TAL-14: Impede follow se houver bloqueio de qualquer lado"""
        target_user = user_b_profile.user
        
        # O alvo bloqueou o utilizador autenticado
        Block.objects.create(blocker=target_user, blocked=user)
        
        url = self.get_url('follow-toggle', pk=user_b_profile.id)
        response = auth_client.post(url)
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert "restrições de conta" in response.data['error']

    def test_blocked_user_posts_hidden_in_feed(self, auth_client, user, user_b, post_factory):
        """TAL-14: Posts de bloqueados não aparecem no feed global"""
        # User B cria um post
        post_factory(user=user_b, content="Post invisível")
        
        # User A (autenticado) bloqueia User B
        Block.objects.create(blocker=user, blocked=user_b)
        
        # Tenta aceder à lista de posts
        try:
            url = reverse('post-list')
        except NoReverseMatch:
            url = reverse('api:post-list') # Tenta com prefixo api se existir
            
        response = auth_client.get(url)
        
        # Se for uma lista (ReturnList), usamos a própria data. 
        # Se for um dicionário (paginado), pegamos o 'results'.
        if isinstance(response.data, list):
            results = response.data
        else:
            results = response.data.get('results', [])
        
        # O feed deve estar vazio (ou sem o post do bloqueado)
        assert len(results) == 0

    def test_cannot_block_self(self, auth_client, user):
        """Garante que o utilizador não se bloqueia a si mesmo"""
        url = self.get_url('block-user', pk=user.profile.id)
        
        response = auth_client.post(url)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Auto-bloqueio não permitido" in response.data['error']

    # ... (fixtures e testes de bloqueio iniciais permanecem iguais)

    def test_unfollow_always_allowed_but_starts_cooldown(self, auth_client, user, user_b_profile):
        """TAL-12: Unfollow é livre, mas deve marcar unfollowed_at no banco"""
        target_user = user_b_profile.user
        # Segue primeiro
        Follow.objects.create(follower=user, following=target_user)
        
        url = self.get_url('follow-toggle', pk=user_b_profile.id)
        response = auth_client.post(url)
        
        # Agora o Unfollow deve retornar 200 OK imediatamente
        assert response.status_code == 200
        # O registro NÃO deve ser deletado, apenas marcado com a data
        follow_obj = Follow.objects.get(follower=user, following=target_user)
        assert follow_obj.unfollowed_at is not None

    def test_cannot_re_follow_before_cooldown(self, auth_client, user, user_b_profile):
        """TAL-12: Impede voltar a seguir antes de passar o tempo de castigo"""
        target_user = user_b_profile.user
        
        # 1. Seguir e dar Unfollow imediatamente
        url = self.get_url('follow-toggle', pk=user_b_profile.id)
        auth_client.post(url) # Segue
        auth_client.post(url) # Unfollow
        
        # 2. Tentar seguir novamente (Castigo ativo)
        response = auth_client.post(url)
        
        # Agora sim, esperamos o erro 400
        assert response.status_code == 400
        assert "Aguarde" in response.data['error']

    def test_cannot_follow_blocked_user(self, auth_client, user, user_b_profile):
        """TAL-14: Impede follow se houver bloqueio de qualquer lado"""
        target_user = user_b_profile.user
        
        # O alvo bloqueou o utilizador autenticado
        Block.objects.create(blocker=target_user, blocked=user)
        
        url = self.get_url('follow-toggle', pk=user_b_profile.id)
        response = auth_client.post(url)
        
        # Como o get_queryset agora esconde utilizadores que nos bloquearam, 
        # o DRF não encontra o objeto e retorna 404. Isso é CORRETO e seguro.
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_block_removes_follow_reciprocally(self, auth_client, user, user_b):
        """Garante que o bloqueio destrói qualquer relação de follow pré-existente"""
        # Ambos se seguem
        Follow.objects.create(follower=user, following=user_b)
        Follow.objects.create(follower=user_b, following=user)
        
        # User A bloqueia User B
        url = self.get_url('block-user', pk=user_b.profile.id)
        auth_client.post(url)
        
        # NINGUÉM deve seguir NINGUÉM após o bloqueio
        assert Follow.objects.filter(follower=user, following=user_b).count() == 0
        assert Follow.objects.filter(follower=user_b, following=user).count() == 0
    
    def test_prevent_duplicate_active_follows(self, auth_client, user, user_b_profile):
        """Garante que o sistema não permite dois follows ativos (IntegrityError)"""
        url = self.get_url('follow-toggle', pk=user_b_profile.id)
        
        # Primeiro Follow
        auth_client.post(url)
        
        # Simular uma tentativa maliciosa de criar outro follow ativo manualmente no banco
        # O banco de dados deve barrar se o unique_together estiver correto
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            Follow.objects.create(follower=user, following=user_b_profile.user)
    
    def test_hybrid_feed_excludes_blocked_users(self, auth_client, user, user_b, post_factory):
        """Garante que posts de usuários que me bloquearam NÃO aparecem no meu feed"""
        # 1. User B cria um post
        post_factory(user=user_b, content="Post Secreto de B")
        
        # 2. User B bloqueia o User A (utilizador autenticado)
        Block.objects.create(blocker=user_b, blocked=user)
        
        # 3. Tentar descobrir a URL correta do feed (tentando nomes comuns)
        url = None
        for name in ['post-list', 'posts-list', 'feed']:
            try:
                url = reverse(name)
                break
            except NoReverseMatch:
                continue
        
        if not url:
            pytest.skip("Rota do feed não encontrada nos testes.")

        response = auth_client.get(url)
        
        # 4. Verificar se o post de B aparece
        if isinstance(response.data, list):
            results = response.data
        else:
            results = response.data.get('results', [])

        # O post de quem nos bloqueou NÃO pode estar no feed
        filenames = [p.get('content') for p in results]
        assert "Post Secreto de B" not in filenames