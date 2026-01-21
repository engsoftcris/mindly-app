from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django import forms
from django.core.exceptions import ValidationError
from django.utils.html import format_html
from PIL import Image

from .models import User


class UserAdminForm(forms.ModelForm):
    class Meta:
        model = User
        fields = "__all__"

    def clean_profile_picture(self):
        image = self.cleaned_data.get("profile_picture")

        if not image:
            return image

        # Verifica se 'image' tem o atributo 'content_type' 
        # (Isso só acontece quando um NOVO arquivo é enviado)
        if hasattr(image, 'content_type'):
            # limite de tamanho: 2MB
            max_size = 2 * 1024 * 1024
            if image.size > max_size:
                raise ValidationError("A imagem deve ter no máximo 2MB.")

            # tipo MIME
            if image.content_type not in ("image/jpeg", "image/png"):
                raise ValidationError("Formato inválido. Use JPEG ou PNG.")

            # validação real do conteúdo com Pillow
            try:
                # Importante: usar o 'image' diretamente pode fechar o stream, 
                # por isso abrimos apenas para verificar.
                img = Image.open(image)
                img.verify()
            except Exception:
                raise ValidationError("Arquivo inválido ou corrompido.")

        return image


@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    model = User
    form = UserAdminForm

    # TAL-26: Adicionado image_status e ajustado para mostrar a foto menor na lista
    list_display = (
        "username",
        "email",
        "full_name",
        "image_status",  # Novo
        "photo_list_preview",  # Miniatura pequena para a lista
        "is_private",
        "is_staff",
    )

    # TAL-26: Filtros para moderação rápida
    list_filter = ("image_status", "is_private", "is_active", "is_staff")
    
    readonly_fields = ("photo_preview",)

    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Perfil", {
            "fields": (
                "full_name",
                "bio",
                "profile_picture",
                "photo_preview", # Preview grande dentro do formulário
                "image_status",  # Campo de moderação
                "phone",
                "is_private",
            )
        }),
        ("Permissões", {
            "fields": (
                "is_active",
                "is_staff",
                "is_superuser",
                "groups",
                "user_permissions",
            )
        }),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "username",
                "email",
                "full_name",
                "password1",
                "password2",
            ),
        }),
    )

    search_fields = ("username", "email", "full_name")
    ordering = ("username",)

    # --- MÉTODOS DE PREVIEW ---
    
    def photo_list_preview(self, obj):
        """Miniatura pequena para a listagem geral"""
        if obj.profile_picture:
            return format_html(
                '<img src="{}" style="width:35px;height:35px;border-radius:50%;object-fit:cover;" />',
                obj.profile_picture.url
            )
        return "-"
    photo_list_preview.short_description = "Avatar"

    def photo_preview(self, obj):
        """Preview maior dentro da página de edição"""
        if obj.profile_picture:
            return format_html(
                '<a href="{0}" target="_blank">'
                '<img src="{0}" style="max-height:150px;border-radius:8px;border: 2px solid #ddd;" />'
                '</a>',
                obj.profile_picture.url
            )
        return "Sem imagem"
    photo_preview.short_description = "Visualização da Foto"

    # --- TAL-26: BULK ACTIONS ---
    actions = ['approve_images', 'reject_images']

    @admin.action(description='Aprovar fotos selecionadas')
    def approve_images(self, request, queryset):
        count = queryset.update(image_status='APPROVED')
        self.message_user(request, f"{count} usuários aprovados.")

    @admin.action(description='Rejeitar fotos selecionadas')
    def reject_images(self, request, queryset):
        count = queryset.update(image_status='REJECTED')
        self.message_user(request, f"{count} usuários rejeitados.")