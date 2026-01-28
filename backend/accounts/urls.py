from django.urls import path
from .views import UserProfileView, GoogleLoginView  
from .views_picture import UserProfilePictureView

urlpatterns = [
    path("profile/", UserProfileView.as_view(), name="user-profile"),
    path(
        "profile/picture/",
        UserProfilePictureView.as_view(),
        name="user-profile-picture",
    ),
    path("google-login/", GoogleLoginView.as_view(), name="google_login"),
]