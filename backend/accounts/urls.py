from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserProfileView,          # A view que o React chama
    GoogleLoginView, 
    HybridFeedView,
    ProfileViewSet,
    UserPostsListView
)
from .views_picture import UserProfilePictureView 

router = DefaultRouter()
router.register(r'profiles', ProfileViewSet, basename='profile')

urlpatterns = [
    # ESTA É A LINHA QUE ESTAVA FALTANDO/ERRADA:
    # Removemos o 'me/' e deixamos só 'profile/' para bater com o React
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    
    path('profile/picture/', UserProfilePictureView.as_view(), name='user-profile-picture'),
    
    path("google-login/", GoogleLoginView.as_view(), name="google_login"),
    path('feed/', HybridFeedView.as_view(), name='network-feed'),
    path('profiles/<uuid:pk>/posts/', UserPostsListView.as_view(), name='user-posts-list'),
    
    path('', include(router.urls)),
]