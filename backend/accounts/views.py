# pylint: disable=arguments-renamed, consider-using-set-comprehension, consider-using-in
from datetime import timedelta
from typing import cast, Set, TYPE_CHECKING

from django.db.models import Q, Count
from django.shortcuts import render
from django.utils.timezone import now
from django.contrib.auth import get_user_model

from rest_framework import generics, status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from social_django.utils import load_strategy, load_backend
from social_core.exceptions import MissingBackend, AuthTokenError

from .models import (
    Profile,
    Block,
    Post,
    Follow,
    Like,
    Notification,
    Report,
    Comment,
)
from .serializers import (
    GoogleAuthSerializer,
    PostSerializer,
    UserProfileSerializer,
    ProfileSerializer,
    NotificationSerializer,
    ReportCreateSerializer,
    ReportAdminSerializer,
    FollowUserSerializer,
    CommentSerializer,
    MyTokenObtainPairSerializer,
)

if TYPE_CHECKING:
    from .models import User as UserModel
    from django.contrib.auth.models import AnonymousUser
User = get_user_model()


# --- ROOT API ---
class ApiRootView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        context = {"status": "online", "timestamp": now().isoformat()}
        return render(request, "api.html", context)


# --- AUTHENTICATION ---
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_token = serializer.validated_data["access_token"]
        strategy = load_strategy(request)
        try:
            backend = load_backend(
                strategy=strategy, name="google-oauth2", redirect_uri=None
            )
            user = backend.do_auth(access_token)
        except (MissingBackend, AuthTokenError) as e:
            return Response(
                {"error": "Token do Google inválido ou expirado", "details": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if user:
            if not user.is_active:
                return Response(
                    {"error": "Usuário desativado"}, status=status.HTTP_401_UNAUTHORIZED
                )
            refresh = RefreshToken.for_user(user)
            user_data = UserProfileSerializer(user, context={"request": request}).data
            return Response(
                {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "user": user_data,
                }
            )
        return Response(
            {"error": "Erro desconhecido ao autenticar"},
            status=status.HTTP_400_BAD_REQUEST,
        )


class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer


class FeedPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


# --- PROFILES & SOCIAL LOGIC ---
class ProfileViewSet(viewsets.ModelViewSet[Profile]):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = cast("UserModel", self.request.user)
        if not user.is_authenticated:
            return Profile.objects.none()
        blocked_ids = Block.objects.filter(blocker=user).values_list(
            "blocked_id", flat=True
        )
        blocked_by_ids = Block.objects.filter(blocked=user).values_list(
            "blocker_id", flat=True
        )
        all_blocked = set(list(blocked_ids) + list(blocked_by_ids))
        queryset = (
            Profile.objects.select_related("user")
            .prefetch_related("user__posts", "user__followers", "user__following")
            .exclude(Q(user__id__in=all_blocked) | Q(user__is_banned=True))
        )
        if self.action in ["list", "suggestions_followers"]:
            queryset = queryset.exclude(user=user)
        return queryset.order_by("user__username")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def get_object(self):
        if self.action in ["block_user", "follow_toggle", "connections"]:
            pk = self.kwargs.get("pk")
            if not pk:
                raise PermissionDenied("PK missing")
            return Profile.objects.get(pk=pk)
        return super().get_object()

    @action(detail=False, methods=["get"], url_path="blocked-users")
    def blocked_users(self, request):
        me = cast("UserModel", request.user)
        blocked_relations = Block.objects.filter(blocker=me).select_related("blocked")
        blocked_profiles = Profile.objects.filter(
            user__in=[relation.blocked for relation in blocked_relations]
        )
        serializer = ProfileSerializer(
            blocked_profiles, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="block")
    def block_user(self, request, pk=None):  # pylint: disable=unused-argument
        profile_to_block = self.get_object()
        user_to_block = profile_to_block.user
        me = cast("UserModel", request.user)
        if me == user_to_block:
            return Response({"error": "Auto-bloqueio não permitido."}, status=400)
        block_exists = Block.objects.filter(blocker=me, blocked=user_to_block)
        if block_exists.exists():
            block_exists.delete()
            return Response({"message": "Utilizador desbloqueado."}, status=200)
        Block.objects.create(blocker=me, blocked=user_to_block)
        Follow.objects.filter(
            Q(follower=me, following=user_to_block)
            | Q(follower=user_to_block, following=me)
        ).delete()
        me.following.remove(user_to_block)
        user_to_block.following.remove(me)
        return Response({"message": "Utilizador bloqueado com sucesso."}, status=201)

    @action(detail=True, methods=["get"], url_path="connections")
    def connections(self, request, pk=None): # pylint: disable=unused-argument
        profile = self.get_object()
        user_logado = cast("UserModel", request.user)
        connection_type = request.query_params.get("type", "followers")

        if connection_type == "following":
            # Usuários que este perfil segue
            following_ids = Follow.objects.filter(
                follower=profile.user, unfollowed_at__isnull=True
            ).values_list("following_id", flat=True)
            queryset = User.objects.filter(id__in=following_ids)
        else:  # followers
            # Usuários que seguem este perfil
            followers_ids = Follow.objects.filter(
                following=profile.user, unfollowed_at__isnull=True
            ).values_list("follower_id", flat=True)
            queryset = User.objects.filter(id__in=followers_ids)

        # Filtra bloqueados
        if user_logado.is_authenticated:
            blocked_ids = Block.objects.filter(blocker=user_logado).values_list(
                "blocked_id", flat=True
            )
            blocked_by_ids = Block.objects.filter(blocked=user_logado).values_list(
                "blocker_id", flat=True
            )
            all_blocked = set(list(blocked_ids) + list(blocked_by_ids))
            queryset = queryset.exclude(id__in=all_blocked)

        serializer = FollowUserSerializer(
            queryset, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="follow")
    def follow_toggle(self, request, pk=None):  # pylint: disable=unused-argument
        target_profile = self.get_object()
        target_user = target_profile.user
        me = cast("UserModel", request.user)
        if me == target_user:
            return Response({"error": "You cannot follow yourself."}, status=400)
        if Block.objects.filter(
            Q(blocker=target_user, blocked=me) | Q(blocker=me, blocked=target_user)
        ).exists():
            return Response({"error": "Action unavailable due to blocks."}, status=403)
        follow_obj = Follow.all_objects.filter(
            follower=me, following=target_user
        ).first()
        if follow_obj and follow_obj.unfollowed_at is None:
            follow_obj.unfollowed_at = now()
            follow_obj.save(update_fields=["unfollowed_at"])
            return Response(
                {
                    "is_following": False,
                    "message": "Unfollowed.",
                    "can_follow_again": follow_obj.can_follow_again(),
                },
                status=200,
            )
        if follow_obj and follow_obj.unfollowed_at is not None:
            if not follow_obj.can_follow_again():
                time_remaining = (
                    follow_obj.unfollowed_at + timedelta(minutes=5) - now()
                ).seconds // 60
                return Response(
                    {
                        "error": f"Wait {time_remaining} minutes before following again.",
                        "cooldown": True,
                        "minutes_remaining": time_remaining,
                    },
                    status=400,
                )
            follow_obj.unfollowed_at = None
            follow_obj.save(update_fields=["unfollowed_at"])
            return Response(
                {"is_following": True, "message": "Following again."}, status=200
            )
        Follow.objects.create(follower=me, following=target_user)
        return Response({"is_following": True, "message": "Following."}, status=201)

    @action(detail=False, methods=["get"], url_path="relationships-sync")
    def relationships_sync(self, request):
        user = cast("UserModel", request.user)

        # quem eu sigo
        following_ids = Follow.objects.filter(
            follower=user, unfollowed_at__isnull=True
        ).values_list("following_id", flat=True)

        # quem me segue
        followers_ids = Follow.objects.filter(
            following=user, unfollowed_at__isnull=True
        ).values_list("follower_id", flat=True)

        # quem eu bloqueei
        blocked_ids = Block.objects.filter(blocker=user).values_list(
            "blocked_id", flat=True
        )

        return Response(
            {
                "following": list(following_ids),
                "followers": list(followers_ids),
                "blockedUsers": list(blocked_ids),
            },
            status=200,
        )


class UserProfileView(generics.RetrieveUpdateAPIView["UserModel"]):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return cast("UserModel", self.request.user)

    def get_serializer_context(self):
        return {"request": self.request}


# --- POSTS & FEED ---
class PostViewSet(viewsets.ModelViewSet[Post]):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        user = cast("UserModel", self.request.user)
        blocked_ids = Block.objects.filter(
            Q(blocker=user) | Q(blocked=user)
        ).values_list("blocker_id", "blocked_id")
        all_blocks = set([item for sublist in blocked_ids for item in sublist])
        return (
            Post.objects.select_related("user", "user__profile")
            .prefetch_related(
                "likes", "comments", "comments__author", "comments__author__profile"
            )
            .filter(user__is_banned=False, is_deleted=False)
            .filter(Q(user__profile__is_private=False) | Q(user=user))
            .exclude(user__id__in=all_blocks)
            .distinct()
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        instance = serializer.save(user=cast("UserModel", self.request.user))
        if instance.media:
            try:
                if hasattr(instance.media, "file"):
                    instance.media.file.close()
                del instance.media.file
            except Exception as e:  # pylint: disable=broad-exception-caught
                print(f"Erro ao limpar temporários: {e}")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != cast("UserModel", request.user):
            return Response({"error": "Sem permissão."}, status=403)
        instance.delete()
        return Response({"message": "Removido."}, status=204)

    def perform_update(self, serializer):
        if serializer.instance.user != cast("UserModel", self.request.user):
            raise PermissionDenied("Não podes editar.")
        serializer.save(moderation_status="PENDING")

    @action(detail=True, methods=["post"], url_path="like")
    def toggle_like(self, request, pk=None):  # pylint: disable=unused-argument
        post = self.get_object()
        user = cast("UserModel", self.request.user)
        like_queryset = Like.objects.filter(user=user, post=post)
        if like_queryset.exists():
            like_queryset.delete()
            is_liked = False
        else:
            Like.objects.create(user=user, post=post)
            is_liked = True
        post.refresh_from_db()
        return Response(
            {"is_liked": is_liked, "likes_count": post.likes.count()}, status=200
        )


class HybridFeedView(generics.ListAPIView[Post]):
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = FeedPagination

    def get_queryset(self):
        user = cast("UserModel", self.request.user)
        following_only = self.request.query_params.get("following") == "true"
        following_ids = Follow.objects.filter(
            follower=user, unfollowed_at__isnull=True
        ).values_list("following_id", flat=True)
        blocked_ids = Block.objects.filter(blocker=user).values_list(
            "blocked_id", flat=True
        )
        blocked_by_ids = Block.objects.filter(blocked=user).values_list(
            "blocker_id", flat=True
        )
        all_blocked = set(list(blocked_ids) + list(blocked_by_ids))
        queryset = (
            Post.objects.select_related("user", "user__profile")
            .prefetch_related("likes", "comments")
            .annotate(num_likes=Count("likes"))
        )
        queryset = queryset.filter(user__is_banned=False, is_deleted=False).exclude(
            Q(user=user) | Q(user__id__in=all_blocked) | Q(user__is_superuser=True)
        )
        if following_only:
            queryset = queryset.filter(user__id__in=following_ids)
        else:
            queryset = queryset.filter(
                Q(user__id__in=following_ids) | Q(user__profile__is_private=False)
            )
        return queryset.distinct().order_by("-created_at")


class UserPostsListView(generics.ListAPIView[Post]):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = FeedPagination

    def get_queryset(self):
        profile_id = self.kwargs.get("pk")
        user = cast("UserModel", self.request.user)
        try:
            profile = Profile.objects.get(id=profile_id)
            if profile.user.is_banned:
                return Post.objects.none()
        except Profile.DoesNotExist:
            return Post.objects.none()
        queryset = Post.objects.filter(user__profile__id=profile_id).exclude(
            moderation_status="REJECTED"
        )
        is_owner = profile.user == user
        is_follower = (
            user.following.filter(id=profile.user.id).exists()
            if user.is_authenticated
            else False
        )
        if profile.is_private and not is_owner and not is_follower:
            return Post.objects.none()
        media_only = self.request.query_params.get("media_only")
        media_type = self.request.query_params.get("type")
        if media_only == "true":
            queryset = queryset.exclude(media__isnull=True).exclude(media="")
            if media_type == "image":
                queryset = queryset.filter(
                    Q(media__icontains=".jpg")
                    | Q(media__icontains=".jpeg")
                    | Q(media__icontains=".png")
                    | Q(media__icontains=".webp")
                )
            elif media_type == "video":
                queryset = queryset.filter(
                    Q(media__icontains=".mp4")
                    | Q(media__icontains=".mov")
                    | Q(media__icontains=".avi")
                )
        return queryset.order_by("-created_at")


class CommentViewSet(viewsets.ModelViewSet[Comment]):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        post_id = self.request.query_params.get("post_id")
        return (
            Comment.objects.filter(post_id=post_id).order_by("-created_at")
            if post_id
            else Comment.objects.all()
        )

    def perform_create(self, serializer):
        serializer.save(author=cast("UserModel", self.request.user))

    def perform_update(self, serializer):
        if self.get_object().author != cast("UserModel", self.request.user):
            raise PermissionDenied("Sem permissão.")
        serializer.save()

    def perform_destroy(self, instance):
        user = cast("UserModel", self.request.user)
        if instance.author == user or instance.post.user == user:
            instance.delete()
        else:
            raise PermissionDenied("Sem autoridade.")


class NotificationViewSet(viewsets.ReadOnlyModelViewSet[Notification]):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = cast("UserModel", self.request.user)
        blocked_ids = Block.objects.filter(blocker=user).values_list(
            "blocked_id", flat=True
        )
        blocked_by_ids = Block.objects.filter(blocked=user).values_list(
            "blocker_id", flat=True
        )
        all_blocked = set(list(blocked_ids) + list(blocked_by_ids))
        return (
            Notification.objects.filter(recipient=user)
            .exclude(sender__id__in=all_blocked)
            .select_related("sender", "sender__profile", "post")
        )

    @action(detail=True, methods=["post"], url_path="mark_as_read")
    def mark_as_read(self, request, pk=None):  # pylint: disable=unused-argument
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(
            {"status": "notification marked as read"}, status=status.HTTP_200_OK
        )


class ReportViewSet(viewsets.ModelViewSet[Report]):
    queryset = Report.objects.all()

    def get_serializer_class(self):
        return (
            ReportCreateSerializer if self.action == "create" else ReportAdminSerializer
        )

    def get_permissions(self):
        return (
            [permissions.IsAuthenticated()]
            if self.action == "create"
            else [permissions.IsAdminUser()]
        )

    def create(self, request, *args, **kwargs):
        post_id, user = request.data.get("post"), cast("UserModel", request.user)
        if Report.objects.filter(reporter=user, post_id=post_id).exists():
            return Response({"detail": "Já denunciaste."}, status=400)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(reporter=user)
        return Response(serializer.data, status=201)


class ModerationViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAdminUser]

    @action(detail=False, methods=["get"])
    def pending_users(self, request):
        profiles = Profile.objects.filter(image_status="PENDING")
        serializer = ProfileSerializer(
            profiles, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def approve_user(self, request, pk=None):  # pylint: disable=unused-argument
        try:
            profile = Profile.objects.get(pk=pk)
            profile.image_status = "APPROVED"
            profile.save()
            return Response({"status": "approved"})
        except Profile.DoesNotExist:
            return Response({"error": "Profile not found"}, status=404)


class SuggestedFollowsView(generics.ListAPIView[Profile]):
    serializer_class = ProfileSerializer

    def get_queryset(self):
        user = cast("UserModel", self.request.user)
        if not user.is_authenticated:
            return Profile.objects.none()
        following_ids = Follow.objects.filter(
            follower=user, unfollowed_at__isnull=True
        ).values_list("following_id", flat=True)
        blocked_ids = Block.objects.filter(blocker=user).values_list(
            "blocked_id", flat=True
        )
        blocked_by_ids = Block.objects.filter(blocked=user).values_list(
            "blocker_id", flat=True
        )
        all_blocked = set(list(blocked_ids) + list(blocked_by_ids))
        return (
            Profile.objects.filter(
                is_private=False, user__is_superuser=False, user__is_active=True
            )
            .exclude(
                Q(user=user)
                | Q(user__id__in=following_ids)
                | Q(user__id__in=all_blocked)
            )
            .order_by("?")[:5]
        )


class UserSearchView(generics.ListAPIView[Profile]):
    serializer_class = ProfileSerializer

    def get_queryset(self):
        user, query = cast(
            "UserModel", self.request.user
        ), self.request.query_params.get("q", None)
        if not query:
            return Profile.objects.none()
        all_blocked: Set[int] = set()
        if user.is_authenticated:
            blocked_ids = Block.objects.filter(blocker=user).values_list(
                "blocked_id", flat=True
            )
            blocked_by_ids = Block.objects.filter(blocked=user).values_list(
                "blocker_id", flat=True
            )
            all_blocked = set(list(blocked_ids) + list(blocked_by_ids))
        return (
            Profile.objects.filter(
                Q(user__username__icontains=query)
                | Q(user__full_name__icontains=query),
                user__is_active=True,
                user__is_superuser=False,
            )
            .exclude(user__id__in=all_blocked)
            .distinct()[:10]
        )
