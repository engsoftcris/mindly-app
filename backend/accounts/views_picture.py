# accounts/views_picture.py
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser

class UserProfilePictureView(APIView):
    permission_classes = [IsAuthenticated]
    # Essencial para processar upload de arquivos no Django
    parser_classes = (MultiPartParser, FormParser)

    def put(self, request):
        user = request.user
        profile = user.profile
        
        # Pega o arquivo da requisição
        file = request.FILES.get('profile_picture') or request.data.get('profile_picture')

        if not file:
            return Response({"error": "No image provided."}, status=400)

        # ATUALIZAÇÃO MANUAL (Garante o PENDING)
        profile.profile_picture = file
        profile.image_status = 'PENDING'
        profile.save()

        # Retorna a URL da imagem e o status correto
        return Response(
            {
                "profile_picture": profile.profile_picture.url,
                "image_status": "PENDING",
                "message": "Enviado para moderação."
            },
            status=status.HTTP_200_OK,
        )