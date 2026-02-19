from rest_framework import generics, status, viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from django.utils.timezone import now
from datetime import timedelta
from .models import Comment
from .serializers import CommentSerializer

# Ferramentas do Social Auth
from social_django.utils import load_strategy, load_backend
from social_core.exceptions import MissingBackend, AuthTokenError

# JWT
from rest_framework_simplejwt.tokens import RefreshToken

from rest_framework.pagination import PageNumberPagination
from django.http import JsonResponse
from datetime import datetime
from django.db.models import Q

# Seus modelos e serializers
from .models import Profile, Block, Post, Follow, Like
from .serializers import (
    GoogleAuthSerializer,
    PostSerializer,
    UserProfileSerializer,
    ProfileSerializer
)

# --- ROOT API ---
def api_root(request):
    return JsonResponse({
        "project": "Mindly API",
        "status": "active",
        "version": "0.1.0",
        "timestamp": datetime.now().isoformat(),
        "author": "engsoftcris"
    })

# --- AUTHENTICATION ---
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        access_token = serializer.validated_data['access_token']
        strategy = load_strategy(request)
        
        try:
            backend = load_backend(strategy=strategy, name='google-oauth2', redirect_uri=None)
            user = backend.do_auth(access_token)
        except (MissingBackend, AuthTokenError) as e:
            return Response(
                {'error': 'Token do Google inválido ou expirado', 'details': str(e)}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if user:
            if not user.is_active:
                return Response({'error': 'Usuário desativado'}, status=status.HTTP_401_UNAUTHORIZED)
            
            refresh = RefreshToken.for_user(user)
            user_data = UserProfileSerializer(user, context={'request': request}).data
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': user_data
            })
        
        return Response({'error': 'Erro desconhecido ao autenticar'}, status=status.HTTP_400_BAD_REQUEST)

def save_full_name(backend, details, response, user=None, *args, **kwargs):
    if backend.name == 'google-oauth2':
        full_name = response.get('name') or details.get('fullname')
        if full_name:
            if user:
                user.full_name = full_name
                user.save()
            details['full_name'] = full_name
    return {'details': details}

# --- PAGINATION ---
class FeedPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50

# --- PROFILES & SOCIAL LOGIC (TAL-12 & TAL-14) ---
class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Se for uma listagem geral (pesquisa/sugestões)
        # Filtramos quem eu bloqueei E quem me bloqueou
        blocked_ids = Block.objects.filter(blocker=user).values_list('blocked_id', flat=True)
        blocked_by_ids = Block.objects.filter(blocked=user).values_list('blocker_id', flat=True)
        all_blocks = list(blocked_ids) + list(blocked_by_ids)

        return Profile.objects.exclude(user__id__in=all_blocks).order_by('user__username')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    @action(detail=True, methods=['post'], url_path='block')
    def block_user(self, request, pk=None):
        profile_to_block = self.get_object()
        user_to_block = profile_to_block.user
        me = request.user

        if me == user_to_block:
            return Response({"error": "Auto-bloqueio não permitido."}, status=400)

        block_exists = Block.objects.filter(blocker=me, blocked=user_to_block)

        if block_exists.exists():
            block_exists.delete()
            return Response({"message": "Utilizador desbloqueado."}, status=200)
        
        # Criar bloqueio
        Block.objects.create(blocker=me, blocked=user_to_block)
        
        # TAL-14: Ao bloquear, removemos as relações de follow de ambos os lados
        me.following.remove(user_to_block)
        user_to_block.following.remove(me)
        
        return Response({"message": "Utilizador bloqueado com sucesso."}, status=201)

    @action(detail=True, methods=['post'], url_path='follow')
    def follow_toggle(self, request, pk=None):
        target_profile = self.get_object()
        target_user = target_profile.user
        me = request.user

        if me == target_user:
            return Response({"error": "Não podes seguir-te a ti mesmo."}, status=400)

        # 1. Verificar Bloqueio
        if Block.objects.filter(Q(blocker=target_user, blocked=me) | Q(blocker=me, blocked=target_user)).exists():
            return Response({"error": "Ação indisponível devido a restrições de conta."}, status=403)

        # 2. Tentar encontrar um registo existente (qualquer um)
        follow_obj = Follow.objects.filter(follower=me, following=target_user).first()

        # CASO A: Ele já segue (unfollowed_at é nulo) -> DAR UNFOLLOW
        if follow_obj and follow_obj.unfollowed_at is None:
            follow_obj.unfollowed_at = now()
            follow_obj.save()
            # Opcional: me.following.remove(target_user) se usares M2M
            return Response({"message": "Deixaste de seguir. Aguarda 5 min para voltar."}, status=200)

        # CASO B: Ele tentou voltar a seguir -> VERIFICAR CASTIGO
        if follow_obj and follow_obj.unfollowed_at is not None:
            wait_time = timedelta(minutes=5)
            if now() < follow_obj.unfollowed_at + wait_time:
                diff = (follow_obj.unfollowed_at + wait_time) - now()
                m, s = divmod(int(diff.total_seconds()), 60)
                return Response({
                    "error": f"Aguarde! Tente novamente em {m}m {s}s."
                }, status=400)
            
            # Castigo passou: Reativar o registo
            follow_obj.unfollowed_at = None
            follow_obj.save()
            return Response({"message": "Voltaste a seguir!"}, status=201)

        # CASO C: Nunca existiu registo -> CRIAR NOVO
        Follow.objects.create(follower=me, following=target_user)
        return Response({"message": "Agora estás a seguir."}, status=201)

# Esta view continua útil para o "Meu Perfil" do usuário logado
class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer 
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user.profile
    
    def get_serializer_context(self):
        return {"request": self.request}

# --- POSTS & FEED ---
class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        user = self.request.user
        # TAL-14: Filtrar para não ver posts de quem me bloqueou ou de quem eu bloqueei
        blocked_users = Block.objects.filter(blocker=user).values_list('blocked_id', flat=True)
        blocked_by = Block.objects.filter(blocked=user).values_list('blocker_id', flat=True)
        all_blocks = list(blocked_users) + list(blocked_by)

        return Post.objects.filter(
            Q(user__profile__is_private=False) | Q(user=user)
        ).exclude(user__id__in=all_blocks).distinct().order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    # NOVO: Garantir que só o dono apaga e que faz Soft Delete
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # 1. Verificação de dono
        if instance.user != request.user:
            return Response(
                {"error": "Não tens permissão para apagar este post."}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 2. Executa o Soft Delete (nosso método customizado no Model)
        instance.delete()
        
        return Response(
            {"message": "Post removido com sucesso (Soft Delete)."}, 
            status=status.HTTP_204_NO_CONTENT
        )
    @action(detail=True, methods=['post'], url_path='like')
    def toggle_like(self, request, pk=None):
        post = self.get_object()
        user = request.user
        
        # Check if the like already exists
        like_queryset = Like.objects.filter(user=user, post=post)
        
        if like_queryset.exists():
            # UNLIKE: If it exists, remove it
            like_queryset.delete()
            is_liked = False
        else:
            # LIKE: If it doesn't exist, create it
            Like.objects.create(user=user, post=post)
            is_liked = True
            
        return Response({
            'is_liked': is_liked,
            'likes_count': post.likes.count()
        }, status=status.HTTP_200_OK)

class HybridFeedView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = FeedPagination

    def get_queryset(self):
        user = self.request.user
        following_users = user.following.all()
        
        # Também aplicamos o filtro de bloqueio aqui por segurança
        blocked_by = Block.objects.filter(blocked=user).values_list('blocker_id', flat=True)
        
        return Post.objects.filter(
            user__in=following_users
        ).exclude(user__id__in=blocked_by).distinct().order_by('-created_at')

class UserPostsListView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = FeedPagination

    def get_queryset(self):
        profile_id = self.kwargs.get('pk')
        user = self.request.user

        # 1. Verificar Bloqueio antes de mais nada
        try:
            profile = Profile.objects.get(id=profile_id)
        except Profile.DoesNotExist:
            return Post.objects.none()

        if Block.objects.filter(Q(blocker=user, blocked=profile.user) | Q(blocker=profile.user, blocked=user)).exists():
            return Post.objects.none()

        # 2. Filtrar Posts
        queryset = Post.objects.filter(
            user__profile__id=profile_id
        ).exclude(moderation_status="REJECTED")
        
        # 3. Lógica de Privacidade
        is_owner = profile.user == user
        is_follower = user.following.filter(id=profile.user.id).exists()

        if profile.is_private and not is_owner and not is_follower:
            return Post.objects.none()

        # 4. Filtros de Mídia (TAL-20)
        media_only = self.request.query_params.get('media_only')
        content_type = self.request.query_params.get('type')

        if media_only == 'true':
            queryset = queryset.exclude(media__isnull=True).exclude(media='')

        if content_type:
            exts = {
                'image': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
                'video': ['.mp4', '.mov', '.avi', '.mkv', '.webm']
            }.get(content_type, [])
            
            q_objects = Q()
            for ext in exts:
                q_objects |= Q(media__icontains=ext)
            queryset = queryset.filter(q_objects)

        return queryset.order_by('-created_at')
    
class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Filtra comentários por post se o ID do post vier na URL
        # Exemplo: /api/comments/?post_id=1
        post_id = self.request.query_params.get('post_id')
        if post_id:
            return Comment.objects.filter(post_id=post_id).order_by('-created_at')
        return Comment.objects.all()

    def perform_create(self, serializer):
        # Associa automaticamente o autor ao usuário logado
        serializer.save(author=self.request.user)    