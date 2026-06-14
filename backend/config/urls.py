import os

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.http import JsonResponse
from django.urls import include, path
from django.views.decorators.csrf import csrf_exempt
from drf_yasg import openapi

# Importações do Swagger
from drf_yasg.views import get_schema_view
from rest_framework import permissions

# Importações do REST Framework
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

# Importações das tuas Views
from accounts.views import (
    ApiRootView,
    CommentViewSet,
    ModerationViewSet,
    MyTokenObtainPairView,
    NotificationViewSet,
    PostViewSet,
    ReportViewSet,
)

# 1. Configuração do Router para Posts e outras ViewSets
# Centraliza as rotas REST padrões (GET, POST, PUT, DELETE) geradas automaticamente pelos ViewSets
router = DefaultRouter()
router.register(r"posts", PostViewSet, basename="post")
router.register(r"comments", CommentViewSet, basename="comment")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"reports", ReportViewSet, basename="report")
router.register(r"moderation", ModerationViewSet, basename="moderation")

# Configuração do Swagger
# Estrutura a documentação automatizada da API com restrição de acesso a usuários autenticados
schema_view = get_schema_view(
    openapi.Info(
        title="Mindly API",
        default_version="v1",
        description="API documentation for Mindly social platform",
        terms_of_service="https://www.mindly.com/terms/",
        contact=openapi.Contact(email="support@mindly.com"),
        license=openapi.License(name="BSD License"),
    ),
    public=False,
    permission_classes=(permissions.IsAuthenticated,),
)


@csrf_exempt
def health_check(request):
    """
    Rota para Cron-job e Health Check do Render.
    Retorna apenas JSON, sem tocar no banco ou em middlewares pesados.
    """
    return JsonResponse(
        {"status": "online", "message": "Mindly Backend is awake"}, status=200
    )


urlpatterns = [
    # Interface administrativa nativa do Django
    path("admin/", admin.site.urls),
    # Telas de login padrão para a interface navegável do próprio Django REST Framework
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    # Swagger URLs
    # Rotas para visualização interativa da documentação técnica da API
    path(
        "swagger/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
    # Rota principal para o Feed e Posts (/api/posts/)
    # Acopla todas as URLs montadas pelo DefaultRouter acima sob o prefixo api/
    path("api/", include(router.urls)),
    # Concentra tudo o que é conta (Login Google, Perfil, Register) aqui
    path("api/accounts/", include("accounts.urls")),
    # Endpoint customizado para geração do par de tokens JWT (Access/Refresh) injetando dados do perfil
    path("api/token/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    # Página raiz provisória da API
    path("", ApiRootView.as_view(), name="api-root"),
    # Rotas de suporte JWT
    # Endpoint padrão para atualizar o access_token enviando um refresh_token válido
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Social Auth
    # Endpoints do python-social-auth para tratar callbacks e redirects OAuth2
    path("social-auth/", include("social_django.urls", namespace="social")),
    # Rota leve de verificação de disponibilidade do servidor (Health Check)
    path("api/health/", health_check, name="health-check"),
]

# Servir Media e Static em Desenvolvimento
# Permite o Django servir arquivos locais de mídia e estáticos caso o ambiente esteja em modo DEBUG
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(
        settings.STATIC_URL, document_root=os.path.join(settings.BASE_DIR, "static")
    )

# Garante o mapeamento dos caminhos de arquivos estáticos coletados pelo Django
urlpatterns += staticfiles_urlpatterns()
