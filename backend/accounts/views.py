from rest_framework import generics, permissions
from .serializers import UserProfileSerializer


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
