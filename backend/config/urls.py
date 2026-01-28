"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from django.contrib.staticfiles.urls import staticfiles_urlpatterns
import os

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # Concentra tudo o que é conta (Login Google, Perfil, Register) aqui
    path("api/accounts/", include("accounts.urls")),
    
    # Rotas de suporte JWT (Úteis para o Admin ou Login Manual)
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    
    # Social Auth (Obrigatório para o social-django funcionar internamente)
    path('social-auth/', include('social_django.urls', namespace='social')),
]

# Servir Media e Static em Desenvolvimento
if settings.DEBUG:
    # Serve arquivos MEDIA (uploads)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    # Serve arquivos STATIC (css, js, imagens padrão)
    urlpatterns += static(settings.STATIC_URL, document_root=os.path.join(settings.BASE_DIR, 'static'))
    
# Esta linha abaixo é o segredo se o 'static()' falhar:
urlpatterns += staticfiles_urlpatterns()