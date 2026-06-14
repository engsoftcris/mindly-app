# pylint: disable=no-member
# Desativa warning do pylint sobre atributos dinâmicos do Django ORM

import uuid

# Usado para gerar IDs únicos (UUIDs) e sufixos aleatórios

from datetime import timedelta

# Usado para cálculos de tempo (ex: regra de 48h no Follow)

from typing import Any

# Tipagem genérica usada em métodos flexíveis

from django.conf import settings

# Permite acessar configurações do projeto (ex: AUTH_USER_MODEL)

from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)

# Base para criação de usuário customizado no Django

from django.core.cache import cache

# Sistema de cache (usado para followers/following count)

from django.core.validators import MaxLengthValidator

# Validação de tamanho máximo em campos de texto

from django.db import models

# ORM principal do Django (models, fields, querysets)

from django.utils.text import slugify

# Import do slugify movido para o topo para corrigir o escopo do Mypy

from django.utils.timezone import now

# Retorna datetime com timezone correto (UTC configurado Django)

# --- MANAGER MODELS ---
# Managers controlam como os dados são consultados no ORM


class PostManager(models.Manager["Post"]):
    # Manager customizado para Post

    def get_queryset(self) -> models.QuerySet["Post"]:
        # Sobrescreve query padrão
        # Filtra automaticamente posts não deletados (soft delete)
        return super().get_queryset().filter(is_deleted=False)


class UserManager(BaseUserManager["User"]):
    # Manager customizado para criação de usuários

    def create_user(
        self,
        email: str,  # campo obrigatório
        username: str | None = None,  # opcional
        password: str | None = None,
        phone: str | None = None,
        **extra_fields: Any,
    ) -> "User":

        # validação básica
        if not email:
            raise ValueError("Email is required")

        # normaliza email (lowercase, etc.)
        email = self.normalize_email(email)

        # O método `save()` já trata o caso de string vazia e gera o username único.
        clean_username = username if username is not None else ""

        # cria instância do usuário sem salvar ainda
        user = self.model(
            username=clean_username, email=email, phone=phone, **extra_fields
        )

        # define senha criptografada ou senha inválida
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        # salva no banco usando DB atual
        user.save(using=self._db)
        return user

    def create_superuser(
        self,
        username: str,
        email: str,
        password: str | None = None,
        **extra_fields: Any,
    ) -> "User":

        # garante permissões de admin
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        # reutiliza create_user
        return self.create_user(
            email=email, username=username, password=password, **extra_fields
        )


# --- USER MODEL ---
# Modelo principal de autenticação customizada


class User(AbstractBaseUser, PermissionsMixin):
    # AbstractBaseUser = base login
    # PermissionsMixin = permissões (groups, permissions)

    PROVIDER_CHOICES = [
        ("local", "Local"),
        ("google", "Google"),
        ("facebook", "Facebook"),
        ("phone", "Phone"),
    ]
    # define origem do login

    username = models.CharField(max_length=50, unique=True)
    # identificador único do usuário

    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=255, null=True, blank=True)

    provider = models.CharField(
        max_length=20, choices=PROVIDER_CHOICES, default="local"
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
    # relacionamento social (quem segue quem)
    # through = usa tabela intermediária Follow

    objects = UserManager()
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    # --- AUTO-GERAÇÃO DE USERNAME ---

    def save(self, *args: Any, **kwargs: Any) -> None:
        # sobrescreve salvamento padrão

        if not self.username:
            # se não vier username, gera automaticamente
            self.username = self.generate_unique_username()
        else:
            # se vier username, limpa formato garantindo tipo str para o Mypy
            clean_username = slugify(self.username).replace("-", "_")
            self.username = clean_username if clean_username else "user"

        super().save(*args, **kwargs)

    def generate_unique_username(self) -> str:
        """
        Gera username único baseado no email ou fallback genérico
        """

        if self.email:
            # pega parte antes do @
            base_username = slugify(self.email.split("@")[0]).replace("-", "_")
        else:
            base_username = "user"

        if not base_username:
            base_username = "user"

        # limita tamanho para caber sufixo
        base_username = base_username[:40]
        username = base_username

        # evita colisão no banco
        while User.objects.filter(username=username).exists():
            short_uuid = uuid.uuid4().hex[:4]
            username = f"{base_username}_{short_uuid}"

        return username

    # --- CACHE DE CONTADORES SOCIAL ---

    def get_followers_count(self) -> int:
        # cache para evitar query pesada
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

    def invalidate_counts_cache(self):
        # limpa cache quando follow/unfollow ocorre
        cache.delete(f"user_followers_count_{self.id}")
        cache.delete(f"user_following_count_{self.id}")

    @property
    def active_followers(self):
        # seguidores ativos (não unfollow)
        return User.objects.filter(
            rel_follower__following=self,
            rel_follower__unfollowed_at__isnull=True,
        )

    @property
    def active_following(self):
        # quem o usuário segue atualmente
        return User.objects.filter(
            rel_following__follower=self,
            rel_following__unfollowed_at__isnull=True,
        )


# --- MEDIA PATH HELPERS ---


def get_post_media_path(_instance: Any, filename: str) -> str:
    # define pasta dinâmica para uploads

    ext = filename.split(".")[-1].lower()

    image_extensions = ["jpg", "jpeg", "png", "gif", "webp"]
    video_extensions = ["mp4", "mov", "avi", "mkv", "webm"]

    media_type = (
        "videos"
        if ext in video_extensions
        else "images" if ext in image_extensions else "others"
    )

    return f"posts/{media_type}/{now().strftime('%Y/%m')}/{filename}"


# --- PROFILE MODEL ---


class Profile(models.Model):
    # perfil 1:1 com usuário

    IMAGE_STATUS_CHOICES = [
        ("PENDING", "Pendente"),
        ("APPROVED", "Aprovado"),
        ("REJECTED", "Rejeitado"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # UUID como chave primária

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
        # representação legível no admin
        return f"Profile: {self.user.username} ({self.image_status})"


# --- POST MODEL ---


class Post(models.Model):
    # conteúdo publicado pelo usuário

    MODERATION_CHOICES = [
        ("PENDING", "Pendente"),
        ("APPROVED", "Aprovado"),
        ("REJECTED", "Rejeitado"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")

    content = models.TextField(validators=[MaxLengthValidator(280)])
    # limite estilo Twitter

    media = models.FileField(upload_to=get_post_media_path, null=True, blank=True)

    is_deleted = models.BooleanField(default=False)
    # soft delete

    moderation_status = models.CharField(
        max_length=10, choices=MODERATION_CHOICES, default="PENDING"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    objects = PostManager()
    all_objects: models.Manager["Post"] = models.Manager()

    def delete(self, *args: Any, **kwargs: Any):
        # soft delete customizado

        force = kwargs.pop("force", False)

        if force:
            return super().delete(*args, **kwargs)

        self.is_deleted = True
        self.save()
        return (1, {str(self._meta.model_name): 1})

    class Meta:
        ordering = ["-created_at"]
        # posts mais recentes primeiro

    def __str__(self) -> str:
        return f"Post by {self.user.username} ({self.moderation_status})"


# --- SOCIAL MODELS ---


class FollowManager(models.Manager["Follow"]):
    # só retorna follows ativos
    def get_queryset(self) -> models.QuerySet["Follow"]:
        return super().get_queryset().filter(unfollowed_at__isnull=True)


class Follow(models.Model):
    # tabela de relacionamento follower -> following

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
        # impede follow duplicado

        indexes = [
            models.Index(fields=["follower", "following"]),
            models.Index(fields=["unfollowed_at"]),
        ]
        # melhora performance de queries sociais

    def __str__(self) -> str:
        status = " (inactive)" if self.unfollowed_at else " (active)"
        return f"{self.follower} follows {self.following}{status}"

    def can_follow_again(self) -> bool:
        # regra de cooldown de 48h para refollow
        if not self.unfollowed_at:
            return True
        return (now() - self.unfollowed_at) >= timedelta(hours=48)

    def save(self, *args: Any, **kwargs: Any) -> None:
        # invalida cache antes de salvar relação social
        if self.follower:
            self.follower.invalidate_counts_cache()
        if self.following:
            self.following.invalidate_counts_cache()

        super().save(*args, **kwargs)

    def delete(self, *args: Any, **kwargs: Any):
        # invalida cache ao deletar follow
        if self.follower:
            self.follower.invalidate_counts_cache()
        if self.following:
            self.following.invalidate_counts_cache()

        return super().delete(*args, **kwargs)


class Block(models.Model):
    # bloqueio entre usuários

    blocker = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="blocking_set"
    )
    blocked = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="blocked_by_set"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("blocker", "blocked")


class Like(models.Model):
    # like em posts

    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="likes"
    )
    post = models.ForeignKey(
        "accounts.Post", on_delete=models.CASCADE, related_name="likes"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "post")


class Comment(models.Model):
    # comentários em posts

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


class Notification(models.Model):
    # sistema de notificações

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


class Report(models.Model):
    # denúncias de conteúdo

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
