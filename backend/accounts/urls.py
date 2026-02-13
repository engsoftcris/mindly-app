from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserProfileView, 
    GoogleLoginView, 
    PostViewSet,
    HybridFeedView
)
from .views_picture import UserProfilePictureView

router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')

urlpatterns = [
    # 1. Manual Paths
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    path("profile/picture/", UserProfilePictureView.as_view(), name="user-profile-picture"),
    path("google-login/", GoogleLoginView.as_view(), name="google_login"),
    # Criteria: Endpoint that returns posts from followed users
    path('feed/', HybridFeedView.as_view(), name='network-feed'),
    # 2. Router Paths (This includes /api/posts/)
    path('', include(router.urls)),
    path('profile/me/', UserProfileView.as_view(), name='my-profile'),
]