from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class UniversalBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            return None
        
        try:
            # Tenta achar o usuário por qualquer um dos 3 campos
            user = User.objects.get(
                Q(username__iexact=username) | 
                Q(email__iexact=username) | 
                Q(phone__iexact=username)
            )
        except User.DoesNotExist:
            return None

        # Verifica a senha (se o usuário tiver uma definida)
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None