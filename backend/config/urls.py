from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
import os

# Importações do REST Framework
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# Importações das tuas Views
from accounts.views import api_root, PostViewSet

# 1. Configuração do Router para Posts e outras ViewSets
router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # Rota principal para o Feed e Posts (/api/posts/)
    path("api/", include(router.urls)),
    
    # Concentra tudo o que é conta (Login Google, Perfil, Register) aqui
    path("api/accounts/", include("accounts.urls")),
    
    path('', api_root, name='index'),
    
    # Rotas de suporte JWT
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    
    # Social Auth
    path('social-auth/', include('social_django.urls', namespace='social')),
]

# Servir Media e Static em Desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=os.path.join(settings.BASE_DIR, 'static'))
    
urlpatterns += staticfiles_urlpatterns()