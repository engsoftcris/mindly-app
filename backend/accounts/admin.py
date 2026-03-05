from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django import forms
from django.core.exceptions import ValidationError
from django.utils.html import format_html
from PIL import Image
from .models import User, Profile, Post, Block, Follow, Report, Notification

# --- FORMULÁRIO DE VALIDAÇÃO PARA O PERFIL ---
class ProfileAdminForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = "__all__"

    def clean_profile_picture(self):
        image = self.cleaned_data.get("profile_picture")
        if not image:
            return image
        if hasattr(image, "content_type"):
            if image.size > 2 * 1024 * 1024:
                raise ValidationError("A imagem deve ter no máximo 2MB.")
            if image.content_type not in ("image/jpeg", "image/png", "image/webp"):
                raise ValidationError("Formato inválido. Use JPEG, PNG ou WebP.")
        return image

# --- INLINE PARA EXIBIR PERFIL DENTRO DO USUÁRIO ---
class ProfileInline(admin.StackedInline):
    model = Profile
    form = ProfileAdminForm
    can_delete = False
    verbose_name_plural = 'Dados de Perfil (Visual/Bio)'
    fk_name = 'user'
    extra = 0

# --- ADMIN DE USUÁRIO (FOCO EM CONTA E ACESSO) ---
@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    model = User
    inlines = (ProfileInline, )

    # Listagem limpa: apenas dados de identificação e segurança
    list_display = ("username", "email", "full_name", "is_staff", "is_banned")
    list_filter = ("is_active", "is_staff", "is_banned")
    search_fields = ("username", "email", "full_name")
    ordering = ("username",)

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Dados da Conta", {"fields": ("full_name", "email", "phone", "provider", "social_id")}),
        ("Status de Acesso", {"fields": ("is_banned", "ban_reason", "is_active", "is_staff", "is_superuser")}),
    )

    actions = ["ban_selected_users", "unban_selected_users"]

    @admin.action(description="Banir usuários selecionados")
    def ban_selected_users(self, request, queryset):
        queryset = queryset.exclude(id=request.user.id)
        count = queryset.update(is_banned=True, ban_reason="Banimento via Admin.")
        self.message_user(request, f"{count} usuários banidos.")

    @admin.action(description="Remover banimento")
    def unban_selected_users(self, request, queryset):
        count = queryset.update(is_banned=False)
        self.message_user(request, f"Banimento removido de {count} usuários.")

# --- ADMIN DE PERFIL (CENTRAL DE MODERAÇÃO DE FOTOS) ---
@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    form = ProfileAdminForm
    # Aqui é onde você aprova as fotos e vê o visual do usuário
    list_display = ['user', 'photo_preview', 'image_status', 'display_name', 'is_private']
    list_filter = ['image_status', 'is_private', 'created_at']
    search_fields = ['user__username', 'display_name', 'user__email']
    readonly_fields = ('created_at', 'updated_at')
    
    actions = ['approve_photos', 'reject_photos']

    def photo_preview(self, obj):
        if obj.profile_picture:
            return format_html(
                '<img src="{}" style="width:45px;height:45px;border-radius:50%;object-fit:cover;border:1px solid #ddd;" />',
                obj.profile_picture.url
            )
        return "Sem foto"
    photo_preview.short_description = "Preview da Foto"

    @admin.action(description="APROVAR fotos selecionadas")
    def approve_photos(self, request, queryset):
        count = queryset.update(image_status="APPROVED")
        self.message_user(request, f"{count} fotos aprovadas.")

    @admin.action(description="REJEITAR fotos selecionadas")
    def reject_photos(self, request, queryset):
        count = queryset.update(image_status="REJECTED")
        self.message_user(request, f"{count} fotos rejeitadas.")

# --- ADMIN DE POSTS (MODERAÇÃO DE CONTEÚDO) ---
@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('user', 'content_preview', 'media_preview', 'moderation_status', 'is_deleted', 'created_at')
    list_filter = ('moderation_status', 'is_deleted', 'created_at')
    search_fields = ('content', 'user__username')

    def get_queryset(self, request):
        return Post.all_objects.all() # Para ver posts deletados (soft delete)

    def delete_model(self, request, obj):
        obj.delete(force=True) # Hard delete no Admin

    def content_preview(self, obj):
        return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
    
    def media_preview(self, obj):
        if not obj.media:
            return "Texto"
        
        url = obj.media.url
        # Verifica se é um formato de vídeo comum
        if url.lower().endswith(('.mp4', '.webm', '.mov')):
            return format_html(
                '<video src="{}" style="width:100px;height:auto;" muted loop playsinline></video>',
                url
            )
        
        # Se for imagem, mantém o padrão
        return format_html(
            '<img src="{}" style="width:45px;height:45px;object-fit:cover;border-radius:4px;" />',
            url
        )

# --- ADMIN DE DENÚNCIAS (REPORTS) ---
@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'reporter', 'status', 'reason', 'created_at')
    list_filter = ('status', 'reason', 'created_at')
    readonly_fields = ('post_preview',)
    actions = ['resolve_report']

    def post_preview(self, obj):
        if obj.post:
            return format_html('<strong>Post:</strong> {}', obj.post.content)
        return "Post removido"

    @admin.action(description="Resolver: Ocultar Post Denunciado")
    def resolve_report(self, request, queryset):
        for obj in queryset:
            if obj.post:
                obj.post.is_deleted = True
                obj.post.save()
            obj.status = 'resolved'
            obj.save()
        self.message_user(request, "Denúncias resolvidas e posts ocultados.")

# --- OUTROS REGISTROS ---
@admin.register(Block)
class BlockAdmin(admin.ModelAdmin):
    list_display = ('blocker', 'blocked', 'created_at')

@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ('follower', 'following', 'created_at')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('recipient', 'sender', 'notification_type', 'is_read', 'created_at')