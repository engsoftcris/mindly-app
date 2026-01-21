from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, username, email=None, password=None, **extra_fields):
        if not username:
            raise ValueError("O username é obrigatório")

        email = self.normalize_email(email) if email else None
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(username, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):

    IMAGE_STATUS_CHOICES = [
        ("PENDING", "Pendente"),
        ("APPROVED", "Aprovado"),
        ("REJECTED", "Rejeitado"),
    ]
    
    image_status = models.CharField(
        max_length=10, 
        choices=IMAGE_STATUS_CHOICES, 
        default="PENDING"
    )
    # IDENTIFICAÇÃO
    username = models.CharField(max_length=30, unique=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)

    # PERFIL
    full_name = models.CharField(max_length=255)
    bio = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to="profiles/", blank=True, null=True)

    # SOCIAL (FUTURO)
    social_id = models.CharField(max_length=255, blank=True, null=True)
    provider = models.CharField(max_length=50, blank=True, null=True)

    # CONTROLE
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    # --- TASK 13 CODE START ---
    is_private = models.BooleanField(
        default=False,
        verbose_name="Private Profile",
        help_text="If enabled, only approved followers can see your content.",
    )
    # --- TASK 13 CODE END ---

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["full_name"]

    def __str__(self):
        return self.username
