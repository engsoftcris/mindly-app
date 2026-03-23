from typing import TYPE_CHECKING, Any, cast

from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.core.exceptions import ValidationError
from django.db.models.query import QuerySet
from django.http import HttpRequest
from django.utils.html import format_html

from .models import Block, Follow, Notification, Post, Profile, Report, User

# --- PROTEÇÃO PARA O RUNTIME (Evita TypeError: 'type' object is not subscriptable) ---
if TYPE_CHECKING:
    BaseModelForm = forms.ModelForm[Profile]
    BaseStackedInline = admin.StackedInline[Profile, User]
    BaseUserAdminClass = BaseUserAdmin[User]  # type: ignore[type-var]
    BaseModelAdminProfile = admin.ModelAdmin[Profile]
    BaseModelAdminPost = admin.ModelAdmin[Post]
    BaseModelAdminReport = admin.ModelAdmin[Report]
    BaseModelAdminBlock = admin.ModelAdmin[Block]
    BaseModelAdminFollow = admin.ModelAdmin[Follow]
    BaseModelAdminNotification = admin.ModelAdmin[Notification]
else:
    BaseModelForm = forms.ModelForm
    BaseStackedInline = admin.StackedInline
    BaseUserAdminClass = BaseUserAdmin
    BaseModelAdminProfile = admin.ModelAdmin
    BaseModelAdminPost = admin.ModelAdmin
    BaseModelAdminReport = admin.ModelAdmin
    BaseModelAdminBlock = admin.ModelAdmin
    BaseModelAdminFollow = admin.ModelAdmin
    BaseModelAdminNotification = admin.ModelAdmin


# --- FORMULÁRIO DE VALIDAÇÃO ---
class ProfileAdminForm(BaseModelForm):
    class Meta:
        model = Profile
        fields = "__all__"

    def clean_profile_picture(self) -> Any:
        image = self.cleaned_data.get("profile_picture")
        if not image:
            return image
        if hasattr(image, "content_type"):
            if image.size > 2 * 1024 * 1024:
                raise ValidationError("A imagem deve ter no máximo 2MB.")
            if image.content_type not in ("image/jpeg", "image/png", "image/webp"):
                raise ValidationError("Formato inválido. Use JPEG, PNG ou WebP.")
        return image


# --- INLINE ---
class ProfileInline(BaseStackedInline):
    model = Profile
    form = ProfileAdminForm
    can_delete = False
    verbose_name_plural = "Dados de Perfil (Visual/Bio)"
    fk_name = "user"
    extra = 0


# --- ADMIN DE USUÁRIO ---
@admin.register(User)
class CustomUserAdmin(BaseUserAdminClass):
    model = User
    inlines = (ProfileInline,)
    list_display = ("username", "email", "full_name", "is_staff", "is_banned")
    list_filter = ("is_active", "is_staff", "is_banned")
    search_fields = ("username", "email", "full_name")
    ordering = ("username",)
    actions = ["ban_selected_users", "unban_selected_users"]
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (
            "Dados da Conta",
            {"fields": ("full_name", "email", "phone", "provider", "social_id")},
        ),
        (
            "Status de Acesso",
            {
                "fields": (
                    "is_banned",
                    "ban_reason",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                )
            },
        ),
    )

    @admin.action(description="Banir usuários selecionados")
    def ban_selected_users(
        self, request: HttpRequest, queryset: QuerySet[User]
    ) -> None:
        user = cast(User, request.user)
        queryset = queryset.exclude(id=user.id)
        count = queryset.update(is_banned=True, ban_reason="Banimento via Admin.")
        self.message_user(request, f"{count} usuários banidos.")

    @admin.action(description="Remover banimento")
    def unban_selected_users(
        self, request: HttpRequest, queryset: QuerySet[User]
    ) -> None:
        count = queryset.update(is_banned=False)
        self.message_user(request, f"Banimento removido de {count} usuários.")


# --- ADMIN DE PERFIL ---
@admin.register(Profile)
class ProfileAdmin(BaseModelAdminProfile):
    form = ProfileAdminForm
    list_display = [
        "user",
        "photo_preview",
        "image_status",
        "display_name",
        "is_private",
    ]
    actions = ["approve_photos", "reject_photos"]
    list_filter = ["image_status", "is_private", "created_at"]
    search_fields = ["user__username", "display_name", "user__email"]
    readonly_fields = ("created_at", "updated_at")

    @admin.display(description="Preview da Foto")
    def photo_preview(self, obj: Profile) -> Any:
        if obj.profile_picture:
            return format_html(
                '<img src="{}" style="width:45px;height:45px;border-radius:50%;object-fit:cover;border:1px solid #ddd;" />',
                obj.profile_picture.url,
            )
        return "Sem foto"

    @admin.action(description="APROVAR fotos selecionadas")
    def approve_photos(self, request: HttpRequest, queryset: QuerySet[Profile]) -> None:
        count = queryset.update(image_status="APPROVED")
        self.message_user(request, f"{count} fotos aprovadas.")

    @admin.action(description="REJEITAR fotos selecionadas")
    def reject_photos(self, request: HttpRequest, queryset: QuerySet[Profile]) -> None:
        count = queryset.update(image_status="REJECTED")
        self.message_user(request, f"{count} fotos rejeitadas.")


# --- ADMIN DE POSTS ---
@admin.register(Post)
class PostAdmin(BaseModelAdminPost):
    list_display = (
        "user",
        "content_preview",
        "media_preview",
        "moderation_status",
        "is_deleted",
        "created_at",
    )
    list_filter = ("moderation_status", "is_deleted", "created_at")
    search_fields = ("content", "user__username")

    def get_queryset(self, request: HttpRequest) -> QuerySet[Post]:
        return Post.all_objects.all()

    def delete_model(self, request: HttpRequest, obj: Post) -> None:
        obj.delete(force=True)

    @admin.display(description="Conteúdo")
    def content_preview(self, obj: Post) -> str:
        return (obj.content[:50] + "...") if len(obj.content) > 50 else obj.content

    @admin.display(description="Mídia")
    def media_preview(self, obj: Post) -> Any:
        if not obj.media:
            return "Texto"
        url = obj.media.url
        if url.lower().endswith((".mp4", ".webm", ".mov")):
            return format_html(
                '<video src="{}" style="width:100px;height:auto;" muted loop playsinline></video>',
                url,
            )
        return format_html(
            '<img src="{}" style="width:45px;height:45px;object-fit:cover;border-radius:4px;" />',
            url,
        )


# --- ADMIN DE DENÚNCIAS ---
@admin.register(Report)
class ReportAdmin(BaseModelAdminReport):
    list_display = ("id", "reporter", "status", "reason", "created_at")
    list_filter = ("status", "reason", "created_at")
    readonly_fields = ("post_preview",)

    @admin.display(description="Preview do Post")
    def post_preview(self, obj: Report) -> Any:
        if obj.post:
            return format_html("<strong>Post:</strong> {}", obj.post.content)
        return "Post removido"

    @admin.action(description="Resolver: Ocultar Post Denunciado")
    def resolve_report(self, request: HttpRequest, queryset: QuerySet[Report]) -> None:
        for obj in queryset:
            if obj.post:
                obj.post.is_deleted = True
                obj.post.save()
            obj.status = "resolved"
            obj.save()
        self.message_user(request, "Denúncias resolvidas e posts ocultados.")


# --- OUTROS REGISTROS ---
@admin.register(Block)
class BlockAdmin(BaseModelAdminBlock):
    list_display = ("blocker", "blocked", "created_at")


@admin.register(Follow)
class FollowAdmin(BaseModelAdminFollow):
    list_display = ("follower", "following", "created_at")


@admin.register(Notification)
class NotificationAdmin(BaseModelAdminNotification):
    list_display = ("recipient", "sender", "notification_type", "is_read", "created_at")
