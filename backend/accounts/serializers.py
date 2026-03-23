from typing import Any, Optional, cast

from rest_framework import exceptions, serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import (Block, Comment, Follow, Notification, Post, Profile,
                     Report, User)

# --- AUXILIARES ---


def get_default_avatar_url(request: Optional[Any]) -> str:
    path = "/static/images/default-avatar.png"
    return request.build_absolute_uri(path) if request else path


# --- SERIALIZERS ---


class UserProfileSerializer(serializers.ModelSerializer[User]):
    id = serializers.CharField(source="profile.id", read_only=True)
    profile_picture = serializers.SerializerMethodField()
    upload_picture = serializers.ImageField(write_only=True, required=False)
    username = serializers.CharField(read_only=True)
    display_name = serializers.CharField(source="profile.display_name", required=False)
    bio = serializers.CharField(source="profile.bio", required=False, allow_blank=True)
    is_private = serializers.BooleanField(source="profile.is_private", required=False)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "full_name",
            "display_name",
            "bio",
            "profile_picture",
            "upload_picture",
            "social_id",
            "provider",
            "is_private",
        ]
        read_only_fields = ["id", "username"]

    def get_profile_picture(self, obj: User) -> str:
        request = self.context.get("request")
        profile = obj.profile
        if profile and profile.image_status == "APPROVED" and profile.profile_picture:
            return (
                request.build_absolute_uri(profile.profile_picture.url)
                if request
                else profile.profile_picture.url
            )
        return get_default_avatar_url(request)

    def validate_upload_picture(self, image: Any) -> Any:
        if image.size > 2 * 1024 * 1024:
            raise serializers.ValidationError("A imagem deve ter no máximo 2MB.")
        return image

    def update(self, instance: User, validated_data: dict[str, Any]) -> User:
        profile_data = validated_data.pop("profile", {})
        instance.full_name = validated_data.get("full_name", instance.full_name)
        instance.email = validated_data.get("email", instance.email)
        instance.save()

        profile = instance.profile
        if profile:
            if "is_private" in profile_data:
                profile.is_private = profile_data["is_private"]
            for attr, value in profile_data.items():
                setattr(profile, attr, value)

            upload_picture = validated_data.pop("upload_picture", None)
            if upload_picture:
                profile.profile_picture = upload_picture
                profile.image_status = "PENDING"
            profile.save()

        return instance


class RegisterSerializer(serializers.ModelSerializer[User]):
    password = serializers.CharField(write_only=True, required=True)
    full_name = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ("username", "email", "full_name", "password")

    def create(self, validated_data: dict[str, Any]) -> User:
        return User.objects.create_user(**validated_data)

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este e-mail já está em uso.")
        return value


class GoogleAuthSerializer(serializers.Serializer[Any]):
    access_token = serializers.CharField()


class FeedAuthorSerializer(serializers.ModelSerializer[User]):
    id = serializers.CharField(source="profile.id", read_only=True)
    profile_picture = serializers.SerializerMethodField()
    display_name = serializers.ReadOnlyField(source="profile.display_name")
    profile_id = serializers.ReadOnlyField(source="profile.id")
    is_blocked = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "profile_id",
            "username",
            "full_name",
            "display_name",
            "profile_picture",
            "is_blocked",
        ]

    def get_is_blocked(self, obj: User) -> bool:
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Block.objects.filter(
                blocker=cast(User, request.user), blocked=obj
            ).exists()
        return False

    def get_profile_picture(self, obj: User) -> str:
        request = self.context.get("request")
        profile = obj.profile
        if profile and profile.image_status == "APPROVED" and profile.profile_picture:
            return (
                request.build_absolute_uri(profile.profile_picture.url)
                if request
                else profile.profile_picture.url
            )
        return get_default_avatar_url(request)


class PostSerializer(serializers.ModelSerializer[Post]):
    author = FeedAuthorSerializer(source="user", read_only=True)
    media_url = serializers.SerializerMethodField()
    likes_count = serializers.IntegerField(source="likes.count", read_only=True)
    is_liked = serializers.SerializerMethodField()
    comments_count = serializers.IntegerField(source="comments.count", read_only=True)
    user_has_commented = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id",
            "author",
            "content",
            "media",
            "is_deleted",
            "media_url",
            "moderation_status",
            "created_at",
            "likes_count",
            "is_liked",
            "comments_count",
            "user_has_commented",
        ]
        read_only_fields = ["id", "author", "created_at", "media_url", "is_deleted"]

    def validate_content(self, value: str) -> str:
        if len(value) > 280:
            raise serializers.ValidationError(
                "Your thought is too long! Keep it under 280 characters."
            )
        return value

    def update(self, instance: Post, validated_data: dict[str, Any]) -> Post:
        upload = validated_data.pop("upload_picture", None)
        if upload:
            profile = instance.user.profile
            if profile:
                profile.profile_picture = upload
                profile.image_status = "PENDING"
                profile.save()
        return super().update(instance, validated_data)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        instance = getattr(self, "instance", None)
        content = attrs.get("content", instance.content if instance else "")
        media = attrs.get("media", instance.media if instance else None)
        content_str = (content or "").strip()
        if not (bool(content_str) or bool(media)):
            raise serializers.ValidationError({"detail": "Post não pode ser vazio."})
        return attrs

    def validate_media(self, file: Any) -> Any:
        if not file:
            return file
        if file.size > 15 * 1024 * 1024:
            raise serializers.ValidationError("Media file is too large.")
        return file

    def get_media_url(self, obj: Post) -> Optional[str]:
        return obj.media.url if obj.media else None

    def get_is_liked(self, obj: Post) -> bool:
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=cast(User, request.user)).exists()
        return False

    def get_user_has_commented(self, obj: Post) -> bool:
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.comments.filter(author=cast(User, request.user)).exists()
        return False


class ProfileSerializer(serializers.ModelSerializer[Profile]):
    user = serializers.ReadOnlyField(source="user.uuid")
    user_id = serializers.ReadOnlyField(source="user.uuid")
    username = serializers.ReadOnlyField(source="user.username")
    email = serializers.ReadOnlyField(source="user.email")
    profile_picture = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    posts = PostSerializer(many=True, read_only=True, source="user.posts")
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "id",
            "user",
            "username",
            "profile_picture",
            "is_blocked",
            "email",
            "user_id",
            "display_name",
            "bio",
            "followers_count",
            "following_count",
            "posts",
            "is_private",
            "is_following",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_is_blocked(self, obj: Profile) -> bool:
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Block.objects.filter(
                blocker=cast(User, request.user), blocked=obj.user
            ).exists()
        return False

    def get_profile_picture(self, obj: Profile) -> str:
        request = self.context.get("request")
        if obj.image_status == "APPROVED" and obj.profile_picture:
            return (
                request.build_absolute_uri(obj.profile_picture.url)
                if request
                else obj.profile_picture.url
            )
        return get_default_avatar_url(request)

    def get_is_following(self, obj: Profile) -> bool:
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Follow.objects.filter(
                follower=cast(User, request.user),
                following=obj.user,
                unfollowed_at__isnull=True,
            ).exists()
        return False

    def to_representation(self, instance: Profile) -> dict[str, Any]:
        data = super().to_representation(instance)
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return data

        real_user = cast(User, request.user)
        is_owner = real_user == instance.user
        is_follower = Follow.objects.filter(
            follower=real_user, following=instance.user, unfollowed_at__isnull=True
        ).exists()

        if instance.is_private and not is_owner and not is_follower:
            return {
                "id": data["id"],
                "username": data["username"],
                "display_name": data["display_name"],
                "profile_picture": data["profile_picture"],
                "is_private": True,
                "is_following": False,
                "is_restricted": True,
                "bio": "Este perfil é privado. Segue para ver o conteúdo.",
                "posts": [],
            }
        data["is_restricted"] = False
        return data

    def get_following_count(self, obj):
        return obj.user.active_following.count()

    def get_followers_count(self, obj):
        return obj.user.active_followers.count()


class BlockSerializer(serializers.ModelSerializer[Block]):
    class Meta:
        model = Block
        fields = ["id", "blocker", "blocked", "created_at"]
        read_only_fields = ["blocker", "created_at"]

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        user = self.context["request"].user
        if user == attrs["blocked"]:
            raise serializers.ValidationError("Não podes bloquear-te a ti próprio.")
        return attrs


class CommentSerializer(serializers.ModelSerializer[Comment]):
    author_name = serializers.ReadOnlyField(source="author.username")
    author_avatar = serializers.SerializerMethodField()
    author_id = serializers.CharField(source="author.profile.id", read_only=True)

    class Meta:
        model = Comment
        fields = [
            "id",
            "post",
            "author",
            "author_id",
            "author_name",
            "author_avatar",
            "content",
            "media_url",
            "is_gif",
            "created_at",
            "image",
        ]
        read_only_fields = ["author", "created_at"]

    def get_author_avatar(self, obj: Comment) -> str:
        request = self.context.get("request")
        profile = obj.author.profile
        if profile and profile.image_status == "APPROVED" and profile.profile_picture:
            return (
                request.build_absolute_uri(profile.profile_picture.url)
                if request
                else profile.profile_picture.url
            )
        return get_default_avatar_url(request)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        instance = getattr(self, "instance", None)
        content = (
            attrs.get("content", instance.content if instance else "") or ""
        ).strip()
        media_url = attrs.get("media_url", instance.media_url if instance else None)
        is_gif = attrs.get("is_gif", instance.is_gif if instance else False)
        image = attrs.get("image", instance.image if instance else None)

        if not (bool(content) or bool(image) or (bool(is_gif) and bool(media_url))):
            raise serializers.ValidationError(
                {"content": "Comentário não pode ficar vazio."}
            )
        return attrs


class FollowUserSerializer(serializers.ModelSerializer[User]):
    username = serializers.CharField(read_only=True)
    display_name = serializers.ReadOnlyField(source="profile.display_name")
    profile_picture = serializers.SerializerMethodField()
    profile_id = serializers.ReadOnlyField(source="profile.id")
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "profile_id",
            "username",
            "is_following",
            "display_name",
            "profile_picture",
        ]

    def get_is_following(self, obj: User) -> bool:
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return Follow.objects.filter(
            follower=cast(User, request.user), following=obj, unfollowed_at__isnull=True
        ).exists()

    def get_profile_picture(self, obj: User) -> str:
        request = self.context.get("request")
        profile = obj.author.profile if hasattr(obj, "author") else obj.profile
        if profile and profile.image_status == "APPROVED" and profile.profile_picture:
            return (
                request.build_absolute_uri(profile.profile_picture.url)
                if request
                else profile.profile_picture.url
            )
        return get_default_avatar_url(request)


class NotificationSerializer(serializers.ModelSerializer[Notification]):
    sender_name = serializers.ReadOnlyField(source="sender.username")
    sender_avatar = serializers.SerializerMethodField()
    sender_uuid = serializers.ReadOnlyField(source="sender.profile.id")
    post_author_profile_id = serializers.SerializerMethodField()
    post_id = serializers.ReadOnlyField(source="post.id")

    class Meta:
        model = Notification
        fields = [
            "id",
            "sender_uuid",
            "sender_name",
            "sender_avatar",
            "notification_type",
            "post_id",
            "post_author_profile_id",
            "is_read",
            "created_at",
        ]

    def get_post_author_profile_id(self, obj: Notification) -> Optional[Any]:
        if obj.post:
            author = getattr(obj.post, "user", None)
            if author and author.profile:
                return author.profile.id
        return None

    def get_sender_avatar(self, obj: Notification) -> Optional[str]:
        if obj.sender and obj.sender.profile and obj.sender.profile.profile_picture:
            request = self.context.get("request")
            return (
                request.build_absolute_uri(obj.sender.profile.profile_picture.url)
                if request
                else obj.sender.profile.profile_picture.url
            )
        return None


class ReportCreateSerializer(serializers.ModelSerializer[Report]):
    reporter = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Report
        fields = ["post", "reason", "description", "reporter"]


class ReportAdminSerializer(serializers.ModelSerializer[Report]):
    reporter_username = serializers.ReadOnlyField(source="reporter.username")
    post_content = serializers.ReadOnlyField(source="post.content")

    class Meta:
        model = Report
        fields = "__all__"


class ModerationUserSerializer(serializers.ModelSerializer[User]):
    profile_picture = serializers.ImageField(
        source="profile.profile_picture", read_only=True
    )
    image_status = serializers.CharField(source="profile.image_status", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "profile_picture", "image_status"]


class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        attrs = cast(dict[str, Any], super().validate(attrs))
        if self.user and self.user.is_banned:
            reason = self.user.ban_reason or "Violação dos termos de uso."
            raise exceptions.PermissionDenied(
                {"detail": "Sua conta foi suspensa.", "ban_reason": reason}
            )
        return attrs
