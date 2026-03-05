from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.http import JsonResponse 
import os
from django.views.decorators.csrf import csrf_exempt
from accounts.views import MyTokenObtainPairView

@csrf_exempt # Garante que requisições externas não sejam barradas por falta de token CSRF
def health_check(request):
    return JsonResponse({"status": "online", "message": "Mindly Backend is awake"}, status=200)

# Importações do REST Framework
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# Importações das tuas Views
from accounts.views import ApiRootView, PostViewSet, CommentViewSet, NotificationViewSet, ReportViewSet, ModerationViewSet


# 1. Configuração do Router para Posts e outras ViewSets
router = DefaultRouter()
router.register(r'posts', PostViewSet, basename='post')
router.register(r'comments', CommentViewSet, basename='comment')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'moderation', ModerationViewSet, basename='moderation')


urlpatterns = [
    path("admin/", admin.site.urls),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    # Rota principal para o Feed e Posts (/api/posts/)
    path("api/", include(router.urls)),
    
    # Concentra tudo o que é conta (Login Google, Perfil, Register) aqui
    path("api/accounts/", include("accounts.urls")),

    path('api/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    path('', ApiRootView.as_view(), name='api-root'),
    
    # Rotas de suporte JWT
    #path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    
    # Social Auth
    path('social-auth/', include('social_django.urls', namespace='social')),
]

# Servir Media e Static em Desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=os.path.join(settings.BASE_DIR, 'static'))
    
urlpatterns += staticfiles_urlpatterns()