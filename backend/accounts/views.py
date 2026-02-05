from rest_framework import generics,status,viewsets,permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

# Ferramentas do Social Auth
from social_django.utils import load_strategy, load_backend
from social_core.exceptions import MissingBackend, AuthTokenError

# JWT
from rest_framework_simplejwt.tokens import RefreshToken

# Seus modelos e serializers
from .serializers import (
    UserProfileSerializer, 
    GoogleAuthSerializer,
    PostSerializer
)
from django.http import JsonResponse
from datetime import datetime

def api_root(request):
    return JsonResponse({
        "project": "Mindly API",
        "status": "active",
        "version": "0.1.0",
        "timestamp": datetime.now().isoformat(),
        "author": "engsoftcris"
    })
from .models import Post

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

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
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'email': user.email,
                    'id': user.id
                }
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