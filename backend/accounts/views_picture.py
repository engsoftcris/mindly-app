# accounts/views_picture.py
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class UserProfilePictureView(APIView):
    """
    View baseada em classe (APIView) responsável exclusivamente por gerenciar
    o upload e a atualização da foto de perfil do usuário autenticado.
    """

    # Garante que apenas usuários logados (autenticados) possam acessar este endpoint
    permission_classes = [IsAuthenticated]

    # Essencial para processar upload de arquivos binários e dados de formulário no Django REST
    parser_classes = (MultiPartParser, FormParser)

    def put(self, request):
        """
        Trata a requisição HTTP PUT para substituir/atualizar a imagem do perfil.
        """
        # Recupera a instância do usuário autenticado vinda do token/sessão
        user = request.user
        # Acessa o perfil (Profile) estendido e vinculado a esse usuário
        profile = user.profile

        # Pega o arquivo da requisição, buscando tanto em FILES quanto no corpo bruto dos dados (data)
        file = request.FILES.get("profile_picture") or request.data.get(
            "profile_picture"
        )

        # Se nenhum arquivo válido foi enviado no payload, retorna um erro de Bad Request (400)
        if not file:
            return Response({"error": "No image provided."}, status=400)

        # ATUALIZAÇÃO MANUAL (Garante o PENDING)
        # Associa o arquivo enviado ao campo de imagem do perfil do usuário
        profile.profile_picture = file
        # Altera forçadamente o status para aguardando moderação antes de salvar
        profile.image_status = "PENDING"
        # Persiste as alterações no banco de dados
        profile.save()

        # Retorna a URL da imagem e o status correto
        return Response(
            {
                "profile_picture": profile.profile_picture.url,
                "image_status": "PENDING",
                "message": "Enviado para moderação.",
            },
            status=status.HTTP_200_OK,
        )
