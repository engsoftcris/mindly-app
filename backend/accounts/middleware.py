from django.http import JsonResponse
from rest_framework import status, exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.contrib.auth import get_user_model

User = get_user_model()

# --- Esta parte é para a API (DRF) ---
class JWTAuthenticationSafe(JWTAuthentication):
    def authenticate(self, request):
        user_auth_tuple = super().authenticate(request)
        if user_auth_tuple is None:
            return None

        user, token = user_auth_tuple
        if getattr(user, 'is_banned', False):
            reason = getattr(user, "ban_reason", "") or "Violação dos termos de uso."
            raise exceptions.PermissionDenied(
                {"detail": "A sua conta foi suspensa. Acesso negado.", "ban_reason": reason}
            )
        return user, token

# --- Esta parte é o que você já tinha (Middleware do Django) ---

class BanMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            # Forçamos uma consulta rápida ao banco para ver o status real atualizado
            # Isso evita que o objeto 'user' antigo na memória da sessão nos engane
            banned = User.objects.filter(
    id=request.user.id,
    is_banned=True
).values("ban_reason").first()

            if banned is not None:
                reason = banned.get("ban_reason") or "Violação dos termos de uso."
                return JsonResponse(
                    {
                        "detail": "A sua conta foi suspensa. Acesso negado.",
                        "ban_reason": reason
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return self.get_response(request)