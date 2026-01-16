from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .serializers import UserProfileSerializer


class UserProfilePictureView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )

        if serializer.is_valid():
            serializer.save()
            return Response(
                {"profile_picture": serializer.data["profile_picture"]},
                status=status.HTTP_200_OK,
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
