from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models


class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None, phone=None, **extra_fields):
        if not username:
            raise ValueError("O username é obrigatório")
        if not email:
            raise ValueError("O email é obrigatório")

        email = self.normalize_email(email)
        user = self.model(
            username=username,
            email=email,
            phone=phone,
            **extra_fields
        )

        if password:
            user.set_password(password)  # Encripta a senha se ela for enviada
        else:
            user.set_unusable_password() # Comportamento para login social
            
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields): # Adiciona password aqui
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if not password:
            raise ValueError("Superuser precisa de uma password para o Admin.")

        # Aqui usamos o model diretamente para não cair no set_unusable_password do create_user
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password) # Superuser tem senha!
        user.save(using=self._db)
        return user

class User(AbstractBaseUser, PermissionsMixin):

    IMAGE_STATUS_CHOICES = [
        ("PENDING", "Pendente"),
        ("APPROVED", "Aprovado"),
        ("REJECTED", "Rejeitado"),
    ]

    PROVIDER_CHOICES = [
        ("google", "Google"),
        ("facebook", "Facebook"),
        ("phone", "Phone"),
    ]

    # IDENTIFICAÇÃO
    username = models.CharField(max_length=30, unique=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)

    # PERFIL
    full_name = models.CharField(max_length=255, null=True, blank=True)
    bio = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to="profiles/", blank=True, null=True)

    # SOCIAL
    provider = models.CharField(
        max_length=20,
        choices=PROVIDER_CHOICES,
        null=True,
        blank=True,
    )
    social_id = models.CharField(max_length=255, null=True, blank=True)

    # STATUS
    image_status = models.CharField(
        max_length=10,
        choices=IMAGE_STATUS_CHOICES,
        default="PENDING",
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_private = models.BooleanField(
        default=False,
        verbose_name="Private Profile",
        help_text="If enabled, only approved followers can see your content.",
    )
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    def is_social(self):
        return self.provider is not None

    def __str__(self):
        return self.username
