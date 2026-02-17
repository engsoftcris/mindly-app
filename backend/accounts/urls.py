from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserProfileView, 
    GoogleLoginView, 
    PostViewSet,
    HybridFeedView,
    ProfileViewSet, # Importado
    UserPostsListView
)
from .views_picture import UserProfilePictureView

router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')
# ADICIONE ESTA LINHA ABAIXO:
router.register(r'profiles', ProfileViewSet, basename='profile')

urlpatterns = [
    # 1. Manual Paths
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    path("profile/picture/", UserProfilePictureView.as_view(), name="user-profile-picture"),
    path("google-login/", GoogleLoginView.as_view(), name="google_login"),
    path('feed/', HybridFeedView.as_view(), name='network-feed'),
    
    # 2. Router Paths (Agora inclui /api/accounts/profiles/)
    path('', include(router.urls)),
    
    path('profile/me/', UserProfileView.as_view(), name='my-profile'),
    path('profiles/<uuid:pk>/posts/', UserPostsListView.as_view(), name='user-posts-list'),
    
    # Esta linha abaixo pode ser removida pois o router.register('profiles'...) 
    # já cria o profile-detail automaticamente!
    # path("profiles/<uuid:pk>/", ProfileViewSet.as_view({'get': 'retrieve'}), name="profile-detail"),
]