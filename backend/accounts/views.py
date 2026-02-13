from rest_framework import generics,status,viewsets,permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

# Ferramentas do Social Auth
from social_django.utils import load_strategy, load_backend
from social_core.exceptions import MissingBackend, AuthTokenError

# JWT
from rest_framework_simplejwt.tokens import RefreshToken

from rest_framework.pagination import PageNumberPagination
# Seus modelos e serializers
from .serializers import (
    GoogleAuthSerializer,
    PostSerializer,
    UserProfileSerializer
)
from .serializers import ProfileSerializer
from django.http import JsonResponse
from datetime import datetime
from django.db.models import Q
from .models import Profile

def api_root(request):
    return JsonResponse({
        "project": "Mindly API",
        "status": "active",
        "version": "0.1.0",
        "timestamp": datetime.now().isoformat(),
        "author": "engsoftcris"
    })
from .models import Post

class GoogleLoginView(APIView):
    """
    Endpoint para autenticação via Google.
    Recebe um 'access_token' do frontend e retorna tokens JWT.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # Valida se o access_token veio no corpo da requisição
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        access_token = serializer.validated_data['access_token']
        strategy = load_strategy(request)
        
        try:
            # Carrega o backend do Google e tenta autenticar o token
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
            
            # Gera os tokens JWT para o seu usuário
            refresh = RefreshToken.for_user(user)
            user_data = UserProfileSerializer(user, context={'request': request}).data
            print("DEBUG LOGIN DATA:", user_data)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': user_data
            })
        
        return Response({'error': 'Erro desconhecido ao autenticar'}, status=status.HTTP_400_BAD_REQUEST)
    
    # accounts/pipeline.py (ou dentro de views.py para testar rápido)

def save_full_name(backend, details, response, user=None, *args, **kwargs):
    if backend.name == 'google-oauth2':
        # Tenta pegar o nome completo vindo do Google
        full_name = response.get('name') or details.get('fullname')
        
        if full_name:
            # Se o usuário já existe, atualiza direto
            if user:
                user.full_name = full_name
                user.save()
            # Se o usuário está sendo criado agora, injeta nos detalhes
            details['full_name'] = full_name
            
    return {'details': details} # IMPORTANTE: Retornar o dicionário


class PostViewSet(viewsets.ModelViewSet):
    # Change this so people can actually see the "English World" feed!
    queryset = Post.objects.all().order_by('-created_at')
    serializer_class = PostSerializer
    
    def get_permissions(self):
        """
        Custom permissions: 
        - Anyone (authenticated) can view and create.
        - Only the owner can Edit (PUT/PATCH) or Delete.
        """
        if self.action in ['update', 'partial_update', 'destroy']:
            # You might need to create a custom IsOwner permission later,
            # but for now, IsAuthenticated is the baseline.
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        # This part is perfect! It connects the post to the logged-in user.
        serializer.save(user=self.request.user)

# Criteria: Load 20 posts per page for performance
class FeedPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50

class UserProfileView(generics.RetrieveUpdateAPIView):
    # 1. Trocamos para o ProfileSerializer (que enxerga o display_name e o UUID)
    serializer_class = ProfileSerializer 
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        # 2. Em vez de retornar o User, retornamos o Profile ligado ao User
        # Isso garante que o PATCH salve no lugar certo!
        return self.request.user.profile
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

class HybridFeedView(generics.ListAPIView):
    """
    Returns a list of posts from users that the current user follows,
    ordered by the most recent first. Includes pagination (20 per page).
    """
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = FeedPagination

    def get_serializer_context(self):
        # Mandatory to generate full URLs for profile pictures
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def get_queryset(self):
        user = self.request.user
        following_users = user.following.all()
        
        # This logic says: "Show posts from people I follow OR posts from ME"
        return Post.objects.filter(
            Q(user__in=following_users) | Q(user=user)
        ).distinct().order_by('-created_at')