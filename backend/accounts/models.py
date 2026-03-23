# pylint: disable=no-member
import uuid
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth.models import (AbstractBaseUser, BaseUserManager,
                                        PermissionsMixin)
from django.core.cache import cache
from django.core.validators import MaxLengthValidator
from django.db import models
from django.utils.timezone import now

# --- MANAGER MODELS ---


class PostManager(models.Manager["Post"]):
    def get_queryset(self) -> models.QuerySet["Post"]:
        return super().get_queryset().filter(is_deleted=False)


class UserManager(BaseUserManager["User"]):
    def create_user(
        self,
        username: str,
        email: str,
        password: str | None = None,
        phone: str | None = None,
        **extra_fields: Any,
    ) -> "User":
        if not username:
            raise ValueError("Username is required")
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, phone=phone, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(
        self,
        username: str,
        email: str,
        password: str | None = None,
        **extra_fields: Any,
    ) -> "User":
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(username, email, password, **extra_fields)


# --- USER MODEL ---


class User(AbstractBaseUser, PermissionsMixin):
    PROVIDER_CHOICES = [
        ("google", "Google"),
        ("facebook", "Facebook"),
        ("phone", "Phone"),
    ]

    username = models.CharField(max_length=30, unique=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=255, null=True, blank=True)

    provider = models.CharField(
        max_length=20, choices=PROVIDER_CHOICES, null=True, blank=True
    )
    social_id = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_banned = models.BooleanField(default=False)
    ban_reason = models.TextField(blank=True, null=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    following: "models.ManyToManyField[User, Follow]" = models.ManyToManyField(
        "self",
        symmetrical=False,
        related_name="followers",
        blank=True,
        through="Follow",
        through_fields=("follower", "following"),
    )

    objects = UserManager()
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    def get_followers_count(self) -> int:
        cache_key = f"user_followers_count_{self.id}"
        count = cache.get(cache_key)
        if count is None:
            count = Follow.objects.filter(following=self).count()
            cache.set(cache_key, count, timeout=300)
        return count

    def get_following_count(self) -> int:
        cache_key = f"user_following_count_{self.id}"
        count = cache.get(cache_key)
        if count is None:
            count = Follow.objects.filter(follower=self).count()
            cache.set(cache_key, count, timeout=300)
        return count

    def invalidate_counts_cache(self) -> None:
        cache.delete(f"user_followers_count_{self.id}")
        cache.delete(f"user_following_count_{self.id}")

    @property
    def profile(self) -> "Profile | None":
        if not self.pk:
            return None
        p, _ = Profile.objects.get_or_create(user=self)
        return p

    @property
    def profile_picture(self) -> Any:
        return self.profile.profile_picture if self.profile else None

    @profile_picture.setter
    def profile_picture(self, value: Any) -> None:
        if self.pk and self.profile:
            self.profile.profile_picture = value
            self.profile.save()

    @property
    def bio(self) -> str:
        return self.profile.bio if self.profile else ""

    @bio.setter
    def bio(self, value: str) -> None:
        if self.pk and self.profile:
            self.profile.bio = value
            self.profile.save()

    @property
    def image_status(self) -> str:
        return self.profile.image_status if self.profile else "PENDING"

    @image_status.setter
    def image_status(self, value: str) -> None:
        if self.pk and self.profile:
            self.profile.image_status = value
            self.profile.save()

    @property
    def active_following(self) -> models.QuerySet["User"]:
        return User.objects.filter(
            rel_follower__follower=self,
            rel_follower__unfollowed_at__isnull=True,
        )

    @property
    def active_followers(self) -> models.QuerySet["User"]:
        return User.objects.filter(
            rel_following__following=self,
            rel_following__unfollowed_at__isnull=True,
        )

    def __str__(self) -> str:
        return str(self.username)


# --- PROFILE & POST MODELS ---


def get_post_media_path(_instance: Any, filename: str) -> str:
    ext = filename.split(".")[-1].lower()
    image_extensions = ["jpg", "jpeg", "png", "gif", "webp"]
    video_extensions = ["mp4", "mov", "avi", "mkv", "webm"]
    media_type = (
        "videos"
        if ext in video_extensions
        else "images" if ext in image_extensions else "others"
    )
    return f"posts/{media_type}/{now().strftime('%Y/%m')}/{filename}"


class Profile(models.Model):
    IMAGE_STATUS_CHOICES = [
        ("PENDING", "Pendente"),
        ("APPROVED", "Aprovado"),
        ("REJECTED", "Rejeitado"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    display_name = models.CharField(max_length=50, blank=True)
    bio = models.TextField(max_length=160, blank=True)
    profile_picture = models.ImageField(upload_to="profiles/", blank=True, null=True)
    image_status = models.CharField(
        max_length=10, choices=IMAGE_STATUS_CHOICES, default="PENDING"
    )
    is_private = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Profile: {self.user.username} ({self.image_status})"


class Post(models.Model):
    MODERATION_CHOICES = [
        ("PENDING", "Pendente"),
        ("APPROVED", "Aprovado"),
        ("REJECTED", "Rejeitado"),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
    content = models.TextField(validators=[MaxLengthValidator(280)])
    media = models.FileField(upload_to=get_post_media_path, null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    moderation_status = models.CharField(
        max_length=10, choices=MODERATION_CHOICES, default="PENDING"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    objects = PostManager()
    all_objects: models.Manager["Post"] = models.Manager()

    def delete(self, *args: Any, **kwargs: Any) -> tuple[int, dict[str, int]]:
        force = kwargs.pop("force", False)
        if force:
            return super().delete(*args, **kwargs)
        self.is_deleted = True
        self.save()
        return (1, {str(self._meta.model_name): 1})

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Post by {self.user.username} ({self.moderation_status})"


# --- SOCIAL MODELS ---


class FollowManager(models.Manager["Follow"]):
    def get_queryset(self) -> models.QuerySet["Follow"]:
        return super().get_queryset().filter(unfollowed_at__isnull=True)


class Follow(models.Model):
    follower = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="rel_follower"
    )
    following = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="rel_following"
    )
    unfollowed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = FollowManager()
    all_objects: models.Manager["Follow"] = models.Manager()

    class Meta:
        unique_together = ("follower", "following")
        indexes = [
            models.Index(fields=["follower", "following"]),
            models.Index(fields=["unfollowed_at"]),
        ]

    def __str__(self) -> str:
        status = " (inactive)" if self.unfollowed_at else " (active)"
        return f"{self.follower} follows {self.following}{status}"

    def can_follow_again(self) -> bool:
        if not self.unfollowed_at:
            return True
        return (now() - self.unfollowed_at) >= timedelta(minutes=5)

    def save(self, *args: Any, **kwargs: Any) -> None:
        if self.follower:
            self.follower.invalidate_counts_cache()
        if self.following:
            self.following.invalidate_counts_cache()
        super().save(*args, **kwargs)

    def delete(self, *args: Any, **kwargs: Any) -> tuple[int, dict[str, int]]:
        if self.follower:
            self.follower.invalidate_counts_cache()
        if self.following:
            self.following.invalidate_counts_cache()
        return super().delete(*args, **kwargs)


class Block(models.Model):
    blocker = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="blocking_set"
    )
    blocked = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="blocked_by_set"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("blocker", "blocked")

    def __str__(self) -> str:
        return f"{self.blocker} bloqueou {self.blocked}"


class Like(models.Model):
    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="likes"
    )
    post = models.ForeignKey(
        "accounts.Post", on_delete=models.CASCADE, related_name="likes"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "post")

    def __str__(self) -> str:
        return f"{self.user.username} liked post {self.post.id}"


class Comment(models.Model):
    post = models.ForeignKey("Post", on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments"
    )
    content = models.TextField(blank=True, null=True)
    media_url = models.TextField(blank=True, null=True)
    is_gif = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    image = models.ImageField(upload_to="comment_images/", null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Comment by {self.author.username} on post {self.post.id}"


class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ("FOLLOW", "Novo Seguidor"),
        ("LIKE", "Novo Gosto"),
        ("COMMENT", "Novo Comentário"),
        ("REPORT_UPDATE", "Atualização de Denúncia"),
    )
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_notifications",
        null=True,
        blank=True,
    )
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    text = models.TextField(null=True, blank=True)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    stored_post_content = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        sender = self.sender.username if self.sender else "SYSTEM"
        return f"{sender} -> {self.recipient.username} ({self.notification_type})"


class Report(models.Model):
    REASON_CHOICES = [
        ("spam", "Spam/Publicidade Indesejada"),
        ("inappropriate", "Conteúdo Impróprio/Nudez"),
        ("hate_speech", "Discurso de Ódio/Assédio"),
        ("violence", "Violência/Conteúdo Sensível"),
        ("other", "Outro"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pendente"),
        ("resolved", "Resolvido"),
        ("ignored", "Ignorado"),
    ]
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports_made"
    )
    post = models.ForeignKey(
        "Post", on_delete=models.CASCADE, related_name="reports_received"
    )
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("reporter", "post")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Report {self.id} - {self.reason} by {self.reporter.username}"
