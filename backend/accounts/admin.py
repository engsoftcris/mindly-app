from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django import forms
from django.core.exceptions import ValidationError
from django.utils.html import format_html
from .models import Post
from PIL import Image

from .models import User, Profile, Block, Follow, Report


class UserAdminForm(forms.ModelForm):
    class Meta:
        model = User
        fields = "__all__"

    def clean_profile_picture(self):
        image = self.cleaned_data.get("profile_picture")

        if not image:
            return image

        # Fix TAL-26: Verifica se é um novo upload (hasattr content_type)
        if hasattr(image, "content_type"):
            max_size = 2 * 1024 * 1024
            if image.size > max_size:
                raise ValidationError("A imagem deve ter no máximo 2MB.")

            if image.content_type not in ("image/jpeg", "image/png"):
                raise ValidationError("Formato inválido. Use JPEG ou PNG.")

            try:
                img = Image.open(image)
                img.verify()
            except Exception:
                raise ValidationError("Arquivo inválido ou corrompido.")

        return image


@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    model = User
    form = UserAdminForm

    list_display = (
        "username",
        "email",
        "full_name",
        "image_status",
        "photo_list_preview",
        "is_staff",
    )

    list_filter = ("image_status", "is_active", "is_staff")

    readonly_fields = ("photo_preview",)

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        (
            "Perfil",
            {
                "fields": (
                    "full_name",
                    "bio",
                    "profile_picture",
                    "photo_preview",
                    "image_status",
                    "phone",
                    )
            },
        ),
        (
            "Permissões",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "username",
                    "email",
                    "full_name",
                    "password1",
                    "password2",
                ),
            },
        ),
    )

    search_fields = ("username", "email", "full_name")
    ordering = ("username",)

    def photo_list_preview(self, obj):
        if obj.profile_picture:
            return format_html(
                '<img src="{}" style="width:35px;height:35px;border-radius:50%;object-fit:cover;" />',
                obj.profile_picture.url,
            )
        return "-"

    photo_list_preview.short_description = "Avatar"

    def photo_preview(self, obj):
        if obj.profile_picture:
            return format_html(
                '<a href="{0}" target="_blank">'
                '<img src="{0}" style="max-height:150px;border-radius:8px;border: 2px solid #ddd;" />'
                "</a>",
                obj.profile_picture.url,
            )
        return "Sem imagem"

    photo_preview.short_description = "Visualização da Foto"

    actions = ["approve_images", "reject_images"]

    @admin.action(description="Aprovar fotos selecionadas")
    def approve_images(self, request, queryset):
        count = queryset.update(image_status="APPROVED")
        self.message_user(request, f"{count} usuários aprovados.")

    @admin.action(description="Rejeitar fotos selecionadas")
    def reject_images(self, request, queryset):
        count = queryset.update(image_status="REJECTED")
        self.message_user(request, f"{count} usuários rejeitados.")

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    # Added 'media_preview' to the list
    list_display = ('user', 'content_preview', 'media_preview', 'is_deleted', 'created_at')
    list_filter = ('created_at', 'user','is_deleted')
    search_fields = ('content', 'user__username')

    # FAZ O ADMIN VER TUDO (Mesmo os is_deleted=True)
    def get_queryset(self, request):
        return Post.all_objects.all()

    # Se o Admin usar a ação de deletar do painel, ele apaga de verdade (Hard Delete)
    def delete_model(self, request, obj):
        obj.delete(force=True)

    def delete_queryset(self, request, queryset):
        # Para a ação em massa no Admin (Delete selected items)
        for obj in queryset:
            obj.delete(force=True)
    def content_preview(self, obj):
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
    
    # New: See if there is a file attached without leaving the list
    def media_preview(self, obj):
        if obj.media:
            # Check if it's an image or video by extension
            ext = obj.media.name.lower()
            if ext.endswith(('.mp4', '.mov', '.avi', '.mkv')):
                return "🎥 Video File"
            return "🖼️ Image File"
        return "No Media"
    
    media_preview.short_description = 'Media Type'

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'display_name', 'is_private'] # Aqui sim!
    list_filter = ['is_private']

@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ('blocker', 'blocked', 'created_at')
    search_fields = ('blocker__username', 'blocked__username')
    list_filter = ('created_at',)

@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ('follower', 'following', 'created_at', 'unfollowed_at')

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'reporter', 'post_owner', 'reason', 'status', 'created_at')
    list_filter = ('status', 'reason', 'created_at')
    search_fields = ('reporter__username', 'post__user__username', 'description')
    readonly_fields = ('created_at', 'updated_at', 'post_preview')
    
    actions = ['mark_as_resolved', 'mark_as_ignored']

    def post_owner(self, obj):
        return obj.post.user.username
    post_owner.short_description = 'Autor do Post'

    def post_preview(self, obj):
        if obj.post:
            return format_html(
                '<strong>Conteúdo do Post:</strong><br>{}<br><br>'
                '<strong>Media:</strong><br>{}',
                obj.post.content,
                format_html('<img src="{}" style="max-height:200px;"/>', obj.post.media.url) if obj.post.media else "Sem media"
            )
        return "Post não disponível"
    post_preview.short_description = 'Detalhes do Conteúdo Denunciado'

    @admin.action(description="Marcar como Resolvido")
    def mark_as_resolved(self, request, queryset):
        queryset.update(status='resolved')
        self.message_user(request, "Denúncias marcadas como resolvidas.")

    @admin.action(description="Ignorar denúncias")
    def mark_as_ignored(self, request, queryset):
        queryset.update(status='ignored')
        self.message_user(request, "Denúncias ignoradas.")