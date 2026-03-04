from rest_framework import generics, status, viewsets, permissions
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from django.utils.timezone import now
from datetime import timedelta, datetime, timezone
from django.http import JsonResponse
from django.db.models import Q, Count
import os

# Ferramentas do Social Auth
from social_django.utils import load_strategy, load_backend
from social_core.exceptions import MissingBackend, AuthTokenError

# JWT
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.pagination import PageNumberPagination

# Seus modelos e serializers
from .models import Profile, User, Block, Post, Follow, Like, Notification, Report, Comment
from .serializers import (
    GoogleAuthSerializer,
    PostSerializer,
    UserProfileSerializer,
    ProfileSerializer,
    NotificationSerializer,
    ReportCreateSerializer,
    ReportAdminSerializer,
    FollowUserSerializer,
    CommentSerializer,
    MyTokenObtainPairSerializer
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

class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

# --- PAGINATION ---
class FeedPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50

# --- PROFILES & SOCIAL LOGIC ---
class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Otimizado com select_related
        blocked_ids = Block.objects.filter(blocker=user).values_list('blocked_id', flat=True)
        blocked_by_ids = Block.objects.filter(blocked=user).values_list('blocker_id', flat=True)
        
        return Profile.objects.select_related('user').prefetch_related(
            'user__posts',
            'user__followers',
            'user__following'
        ).exclude(
            Q(user__id__in=blocked_ids) | 
            Q(user__id__in=blocked_by_ids) |
            Q(user__is_banned=True)
        ).order_by('user__username')
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context
    
    def get_object(self):
        # Garante o funcionamento para UUIDs e ações de Detail
        if self.action in ['block_user', 'follow_toggle', 'connections']:
            return Profile.objects.get(pk=self.kwargs.get('pk'))
        return super().get_object()
    
    @action(detail=False, methods=['get'], url_path='blocked-users')
    def blocked_users(self, request):
        """Lista todos os usuários que o usuário atual bloqueou"""
        me = request.user
        
        # Busca todos os bloqueios feitos pelo usuário
        blocked_relations = Block.objects.filter(blocker=me).select_related('blocked')
        
        # Pega os perfis dos usuários bloqueados
        blocked_profiles = Profile.objects.filter(
            user__in=[relation.blocked for relation in blocked_relations]
        )
        
        # Usa o serializer de perfil (ou um serializer específico)
        serializer = ProfileSerializer(blocked_profiles, many=True, context={'request': request})
        return Response(serializer.data)

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
        
        # Cria bloqueio e limpa relações sociais
        Block.objects.create(blocker=me, blocked=user_to_block)
        
        # Ao bloquear, removemos qualquer rastro de follow (log e relação real)
        Follow.objects.filter(
            Q(follower=me, following=user_to_block) | 
            Q(follower=user_to_block, following=me)
        ).delete()
        
        me.following.remove(user_to_block)
        user_to_block.following.remove(me)
        
        return Response({"message": "Utilizador bloqueado com sucesso."}, status=201)

    @action(detail=True, methods=['get'], url_path='connections')
    def connections(self, request, pk=None):
        profile = self.get_object()
        connection_type = request.query_params.get('type', 'followers')
        
        # Otimizado com select_related
        if connection_type == 'following':
            users = profile.user.following.select_related('profile').all()
        else:
            users = profile.user.followers.select_related('profile').all()

        serializer = FollowUserSerializer(users, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], url_path='follow')
    def follow_toggle(self, request, pk=None):
        target_profile = self.get_object()
        target_user = target_profile.user
        me = request.user

        if me == target_user:
            return Response({"error": "You cannot follow yourself."}, status=400)

        if Block.objects.filter(Q(blocker=target_user, blocked=me) | Q(blocker=me, blocked=target_user)).exists():
            return Response({"error": "Action unavailable due to blocks."}, status=403)

        # Usa all_objects para incluir registros inativos na busca
        follow_obj = Follow.all_objects.filter(follower=me, following=target_user).first()

        # CASO A: DAR UNFOLLOW (Atualmente a seguir - registro ativo)
        if follow_obj and follow_obj.unfollowed_at is None:
            follow_obj.unfollowed_at = now()
            follow_obj.save(update_fields=['unfollowed_at'])
            return Response({
                "is_following": False, 
                "message": "Unfollowed.",
                "can_follow_again": follow_obj.can_follow_again()
            }, status=200)

        # CASO B: SEGUIR NOVAMENTE (Existe registro com unfollow)
        if follow_obj and follow_obj.unfollowed_at is not None:
            # Verifica se já passaram 5 minutos
            if not follow_obj.can_follow_again():
                time_remaining = (follow_obj.unfollowed_at + timedelta(minutes=5) - now()).seconds // 60
                return Response({
                    "error": f"Wait {time_remaining} minutes before following again.",
                    "cooldown": True,
                    "minutes_remaining": time_remaining
                }, status=400)

            # Reativa o follow
            follow_obj.unfollowed_at = None
            follow_obj.save(update_fields=['unfollowed_at'])
            return Response({
                "is_following": True, 
                "message": "Following again."
            }, status=200)

        # CASO C: PRIMEIRA VEZ (Criação limpa)
        Follow.objects.create(follower=me, following=target_user)
        return Response({
            "is_following": True, 
            "message": "Following."
        }, status=201)
    
# Adicione isso logo antes da UserProfilePictureView
class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
    
    def get_serializer_context(self):
        return {"request": self.request}

# --- POSTS & FEED ---
class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        user = self.request.user
        blocked_ids = Block.objects.filter(Q(blocker=user) | Q(blocked=user)).values_list('blocker_id', 'blocked_id')
        all_blocks = set([item for sublist in blocked_ids for item in sublist])

        # Otimizado com select_related e prefetch_related
        return Post.objects.select_related(
            'user', 
            'user__profile'
        ).prefetch_related(
            'likes',
            'comments',
            'comments__author',
            'comments__author__profile'
        ).filter(
            user__is_banned=False, 
            is_deleted=False
        ).filter(
            Q(user__profile__is_private=False) | Q(user=user)
        ).exclude(user__id__in=all_blocks).distinct().order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user:
            return Response({"error": "Sem permissão."}, status=403)
        instance.delete()
        return Response({"message": "Removido."}, status=204)
    
    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            raise PermissionDenied("Não podes editar.")
        serializer.save()

    @action(detail=True, methods=['post'], url_path='like')
    def toggle_like(self, request, pk=None):
        post = self.get_object()
        user = request.user
        like_queryset = Like.objects.filter(user=user, post=post)
        
        if like_queryset.exists():
            like_queryset.delete()
            is_liked = False
        else:
            Like.objects.create(user=user, post=post)
            is_liked = True
        
        # SOLUÇÃO: Atualiza o objeto da memória com os dados novos do banco
        # Isso limpa o cache do prefetch_related apenas para este objeto
        post.refresh_from_db() 
        
        return Response({
            'is_liked': is_liked, 
            'likes_count': post.likes.count() # Agora a contagem estará correta
        }, status=200)
        
class HybridFeedView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = FeedPagination

    def get_queryset(self):
        user = self.request.user
        following_only = self.request.query_params.get('following') == 'true'
        
        # CORREÇÃO: Pegar apenas IDs de quem o usuário SEGUE ATIVAMENTE (sem unfollow)
        following_ids = Follow.objects.filter(
            follower=user, 
            unfollowed_at__isnull=True  # ← FILTRO CRÍTICO!
        ).values_list('following_id', flat=True)
        
        blocked_by = Block.objects.filter(blocked=user).values_list('blocker_id', flat=True)

        # Base da Query
        queryset = Post.objects.select_related('user', 'user__profile') \
            .prefetch_related('likes', 'comments') \
            .annotate(num_likes=Count('likes'))

        # FILTROS DE SEGURANÇA
        queryset = queryset.filter(
            user__is_banned=False,
            is_deleted=False
        ).exclude(user=user)

        # FILTRO PARA SUPERUSUÁRIOS
        queryset = queryset.exclude(user__is_superuser=True)

        # LÓGICA DE EXIBIÇÃO
        if following_only:
            # Aba "Seguindo": mostra APENAS posts de quem o usuário segue ativamente
            queryset = queryset.filter(user__id__in=following_ids)
        else:
            # Aba "Para você": mostra posts de quem segue ativamente OU perfis públicos
            queryset = queryset.filter(
                Q(user__id__in=following_ids) | 
                Q(user__profile__is_private=False)
            )

        # RESPEITAR BLOQUEIOS
        if blocked_by.exists():
            queryset = queryset.exclude(user__id__in=blocked_by)

        return queryset.distinct().order_by('-created_at')
        
class UserPostsListView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = FeedPagination

    def get_queryset(self):
        profile_id = self.kwargs.get('pk')
        user = self.request.user
        try:
            profile = Profile.objects.get(id=profile_id)
            if profile.user.is_banned: return Post.objects.none()
        except Profile.DoesNotExist: return Post.objects.none()

        queryset = Post.objects.filter(user__profile__id=profile_id).exclude(moderation_status="REJECTED")
        
        is_owner = profile.user == user
        is_follower = user.following.filter(id=profile.user.id).exists()
        if profile.is_private and not is_owner and not is_follower: 
            return Post.objects.none()

        # --- NOVA LÓGICA DE FILTRO POR TIPO (TAL-20) ---
        media_only = self.request.query_params.get('media_only')
        media_type = self.request.query_params.get('type') # image ou video

        if media_only == 'true':
            queryset = queryset.exclude(media__isnull=True).exclude(media='')
            
            if media_type == 'image':
                # Filtra pelas extensões de imagem comuns
                queryset = queryset.filter(
                    Q(media__icontains='.jpg') | 
                    Q(media__icontains='.jpeg') | 
                    Q(media__icontains='.png') | 
                    Q(media__icontains='.webp')
                )
            elif media_type == 'video':
                # Filtra pelas extensões de vídeo comuns
                queryset = queryset.filter(
                    Q(media__icontains='.mp4') | 
                    Q(media__icontains='.mov') | 
                    Q(media__icontains='.avi')
                )

        return queryset.order_by('-created_at')
    
class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        post_id = self.request.query_params.get('post_id')
        if post_id:
            return Comment.objects.filter(post_id=post_id).order_by('-created_at')
        return Comment.objects.all()

    def perform_create(self, serializer):
        serializer.save(author=self.request.user) 

    # --- Only the AUTHOR can edit ---
    def perform_update(self, serializer):
        instance = self.get_object()
        if instance.author != self.request.user:
            raise PermissionDenied("You do not have permission to edit this comment.")
        serializer.save()

    # --- Author OR Post Owner can delete ---
    def perform_destroy(self, instance):
        user = self.request.user
        if instance.author == user or instance.post.user == user:
            instance.delete()
        else:
            raise PermissionDenied("You do not have authority to remove this comment.")

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Adicionamos o .exclude() aqui para filtrar globalmente
        return Notification.objects.filter(
            recipient=self.request.user
        ).exclude(
            sender__is_banned=True  # <--- A "mágica" acontece aqui
        ).order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='mark_all_as_read')
    def mark_all_as_read(self, request):
        """
        Marca TODAS as notificações do usuário como lidas.
        Acessível via: POST /api/notifications/mark_all_as_read/
        """
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'all notifications marked as read'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='mark_as_read')
    def mark_as_read(self, request, pk=None):
        """Marca uma específica. Acessível via: POST /api/notifications/{id}/mark_as_read/"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'notification marked as read'}, status=status.HTTP_200_OK)

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    def get_serializer_class(self):
        return ReportCreateSerializer if self.action == 'create' else ReportAdminSerializer
    def get_permissions(self):
        return [permissions.IsAuthenticated()] if self.action == 'create' else [permissions.IsAdminUser()]

    def create(self, request, *args, **kwargs):
        post_id = request.data.get('post')
        if Report.objects.filter(reporter=request.user, post_id=post_id).exists():
            return Response({"detail": "Já denunciaste."}, status=400)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(reporter=request.user)
        return Response(serializer.data, status=201)
    
class ModerationViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    @action(detail=False, methods=['get'])
    def pending_users(self, request):
        # Ajustado para filtrar no Profile
        profiles = Profile.objects.filter(image_status='PENDING')
        # Precisamos de um serializer que entenda que queremos o Profile aqui
        serializer = ProfileSerializer(profiles, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve_user(self, request, pk=None):
        try:
            # pk here is the Profile ID
            profile = Profile.objects.get(pk=pk)
            profile.image_status = 'APPROVED'
            profile.save()
            return Response({'status': 'approved'})
        except Profile.DoesNotExist:
            return Response({'error': 'Profile not found'}, status=404)
        

class SuggestedFollowsView(generics.ListAPIView):
    serializer_class = ProfileSerializer # Ou o seu serializer de perfil

    def get_queryset(self):
        user = self.request.user
        
        # CORREÇÃO: IDs de quem você já SEGUE ATIVAMENTE (sem unfollow)
        following_ids = Follow.objects.filter(
            follower=user,
            unfollowed_at__isnull=True  # ← FILTRO CRÍTICO!
        ).values_list('following_id', flat=True)
        
        # IDs de quem você já deu unfollow (opcional - pode incluir se quiser)
        unfollowed_ids = Follow.objects.filter(
            follower=user,
            unfollowed_at__isnull=False
        ).values_list('following_id', flat=True)
        
        # Query com todos os filtros
        return Profile.objects.filter(
            is_private=False,           # Somente perfis públicos
            user__is_superuser=False,   # NÃO sugere administradores
            user__is_active=True        # Apenas usuários ativos
        ).exclude(
            user=user                   # Não sugere você mesmo
        ).exclude(
            user__id__in=following_ids  # NÃO sugere quem você já segue ativamente
        ).exclude(
            user__id__in=unfollowed_ids # Opcional: remove quem você deu unfollow
        ).order_by('?')[:5]             # Limite de performance

class UserSearchView(generics.ListAPIView):
    serializer_class = ProfileSerializer

    def get_queryset(self):
        query = self.request.query_params.get('q', None)
        if query:
            return Profile.objects.filter(
                Q(user__username__icontains=query) | 
                Q(user__full_name__icontains=query),
                user__is_active=True,
                user__is_superuser=False # Mantendo a nossa regra de segurança!
            ).distinct()[:10]
        return Profile.objects.none()