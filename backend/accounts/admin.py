from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django import forms
from django.core.exceptions import ValidationError
from django.utils.html import format_html
from PIL import Image

from .models import User


# =========================
# FORM COM VALIDAÇÃO PROFISSIONAL
# =========================
class UserAdminForm(forms.ModelForm):
    class Meta:
        model = User
        fields = "__all__"

    def clean_profile_picture(self):
        image = self.cleaned_data.get("profile_picture")

        if not image:
            return image

        # limite de tamanho: 2MB
        max_size = 2 * 1024 * 1024
        if image.size > max_size:
            raise ValidationError("A imagem deve ter no máximo 2MB.")

        # tipo MIME
        if image.content_type not in ("image/jpeg", "image/png"):
            raise ValidationError("Formato inválido. Use JPEG ou PNG.")

        # validação real do conteúdo
        try:
            img = Image.open(image)
            img.verify()
        except Exception:
            raise ValidationError("Arquivo inválido ou corrompido.")

        return image


# =========================
# ADMIN
# =========================
@admin.register(User)
class CustomUserAdmin(BaseUserAdmin):
    model = User
    form = UserAdminForm

    list_display = (
        "username",
        "email",
        "full_name",
        "photo_preview",
        "is_private",
        "is_staff",
    )

    readonly_fields = ("photo_preview",)

    fieldsets = (
        (None, {
            "fields": ("username", "password")
        }),
        ("Perfil", {
            "fields": (
                "full_name",
                "bio",
                "profile_picture",
                "photo_preview",
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

    def photo_preview(self, obj):
        if obj.profile_picture:
            return format_html(
                '<a href="{0}" target="_blank">'
                '<img src="{0}" style="max-height:120px;border-radius:8px;" />'
                '</a>',
                obj.profile_picture.url
            )
        return "Sem imagem"

    photo_preview.short_description = "Foto"
