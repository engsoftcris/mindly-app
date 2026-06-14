from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    GoogleLoginView,
    GoogleFinishRegisterView,
    RegisterView,
    MyTokenObtainPairView,
    HybridFeedView,
    ProfileViewSet,
    ChangePasswordView,
    SuggestedFollowsView,
    UserPostsListView,
    UserProfileView,
    UserSearchView,
)
from .views_picture import UserProfilePictureView

# Inicializa o roteador do DRF para gerar rotas automáticas baseadas em ViewSets
router = DefaultRouter()
router.register(r"profiles", ProfileViewSet, basename="profile")

urlpatterns = [
    # Endpoint do perfil do usuário autenticado atual
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    # Endpoint de busca/filtro global de usuários no sistema
    path("search/", UserSearchView.as_view(), name="user-search"),
    # Endpoint focado no upload físico de imagem de perfil (Multipart/Form-Data)
    path(
        "profile/picture/",
        UserProfilePictureView.as_view(),
        name="user-profile-picture",
    ),
    # Lista de sugestões de novos perfis para seguir
    path(
        "suggested-follows/", SuggestedFollowsView.as_view(), name="suggested-follows"
    ),
    # Cadastro padrão do app via e-mail e senha
    path("register/", RegisterView.as_view(), name="register"),
    # --- FLUXO DO GOOGLE CORRIGIDO ---
    # Login social de quem já possui a conta do Google vinculada no banco
    path("google-login/", GoogleLoginView.as_view(), name="google_login"),
    # Criação de conta enviando o token do Google e o username escolhido na tela de registro
    path(
        "google-register/", GoogleFinishRegisterView.as_view(), name="google_register"
    ),
    # Alteração de senha interna para usuários autenticados
    path(
        "change-password/",
        ChangePasswordView.as_view(),
        name="change-password",
    ),
    # Login tradicional com JWT (SimpleJWT) gerando access e refresh token
    path("login/", MyTokenObtainPairView.as_view(), name="login"),
    # Linha do tempo (feed principal) mesclando posts gerais e seguidos
    path("feed/", HybridFeedView.as_view(), name="network-feed"),
    # Histórico de postagens de um perfil específico filtrado pelo ID em UUID
    path(
        "profiles/<uuid:pk>/posts/", UserPostsListView.as_view(), name="user-posts-list"
    ),
    # Inclui os endpoints do ViewSet registrados no router (ex: /profiles/ para listagens e detalhes)
    path("", include(router.urls)),
]
