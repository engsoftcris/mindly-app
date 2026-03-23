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
from rest_framework_simplejwt.views import (TokenObtainPairView,
                                            TokenRefreshView)

# Importações das tuas Views
from accounts.views import (ApiRootView, CommentViewSet, ModerationViewSet,
                            MyTokenObtainPairView, NotificationViewSet,
                            PostViewSet, ReportViewSet)

# 1. Configuração do Router para Posts e outras ViewSets
router = DefaultRouter()
router.register(r"posts", PostViewSet, basename="post")
router.register(r"comments", CommentViewSet, basename="comment")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"reports", ReportViewSet, basename="report")
router.register(r"moderation", ModerationViewSet, basename="moderation")

# Configuração do Swagger
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
    path("admin/", admin.site.urls),
    path("api-auth/", include("rest_framework.urls", namespace="rest_framework")),
    # Swagger URLs
    path(
        "swagger/",
        schema_view.with_ui("swagger", cache_timeout=0),
        name="schema-swagger-ui",
    ),
    path("redoc/", schema_view.with_ui("redoc", cache_timeout=0), name="schema-redoc"),
    # Rota principal para o Feed e Posts (/api/posts/)
    path("api/", include(router.urls)),
    # Concentra tudo o que é conta (Login Google, Perfil, Register) aqui
    path("api/accounts/", include("accounts.urls")),
    path("api/token/", MyTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("", ApiRootView.as_view(), name="api-root"),
    # Rotas de suporte JWT
    # path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Social Auth
    path("social-auth/", include("social_django.urls", namespace="social")),
    path("api/health/", health_check, name="health-check"),
]

# Servir Media e Static em Desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(
        settings.STATIC_URL, document_root=os.path.join(settings.BASE_DIR, "static")
    )

urlpatterns += staticfiles_urlpatterns()
