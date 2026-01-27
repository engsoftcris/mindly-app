from rest_framework import generics, permissions

from accounts.models import User
from .serializers import RegisterSerializer, UserProfileSerializer


class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    # Passa request para o serializer para construir URL absoluta
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    # Importante: Permitir que qualquer pessoa crie uma conta (AllowAny)
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer