from django.http import JsonResponse
from rest_framework import status, exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication

# --- Esta parte é para a API (DRF) ---
class JWTAuthenticationSafe(JWTAuthentication):
    def authenticate(self, request):
        user_auth_tuple = super().authenticate(request)
        if user_auth_tuple is None:
            return None
            
        user, token = user_auth_tuple
        if getattr(user, 'is_banned', False):
            # TAL-24: Agora incluímos o motivo real do banimento na exceção
            reason = getattr(user, 'ban_reason', None) or "Violação dos termos de uso."
            raise exceptions.PermissionDenied(
                {
                    "detail": "A sua conta foi suspensa. Acesso negado.",
                    "ban_reason": reason
                }
            )
        return user, token

# --- Middleware do Django ---
class BanMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            if getattr(request.user, 'is_banned', False):
                # TAL-24: Captura o motivo para o Middleware também
                reason = getattr(request.user, 'ban_reason', None) or "Violação dos termos de uso."
                return JsonResponse(
                    {
                        "detail": "A sua conta foi suspensa. Acesso negado.",
                        "ban_reason": reason
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
        return self.get_response(request)