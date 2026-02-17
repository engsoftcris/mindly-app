from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models
from django.utils.timezone import now
from django.core.validators import MaxLengthValidator
from django.conf import settings
import uuid


class PostManager(models.Manager):
    def get_queryset(self):
        # O site/app só verá o que NÃO está marcado como deletado
        return super().get_queryset().filter(is_deleted=False)

# --- USER MODELS ---

class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None, phone=None, **extra_fields):
        if not username: raise ValueError("Username is required")
        if not email: raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, phone=phone, **extra_fields)
        if password: user.set_password(password)
        else: user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(username, email, password, **extra_fields)

class User(AbstractBaseUser, PermissionsMixin):
    IMAGE_STATUS_CHOICES = [("PENDING", "Pendente"), ("APPROVED", "Aprovado"), ("REJECTED", "Rejeitado")]
    PROVIDER_CHOICES = [("google", "Google"), ("facebook", "Facebook"), ("phone", "Phone")]

    username = models.CharField(max_length=30, unique=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    full_name = models.CharField(max_length=255, null=True, blank=True)
    bio = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to="profiles/", blank=True, null=True)
    provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, null=True, blank=True)
    social_id = models.CharField(max_length=255, null=True, blank=True)
    image_status = models.CharField(max_length=10, choices=IMAGE_STATUS_CHOICES, default="PENDING")
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    following = models.ManyToManyField(
        "self",
        symmetrical=False,
        related_name="followers",
        blank=True,
        through="Follow" 
    )
    
    date_joined = models.DateTimeField(auto_now_add=True)

    objects = UserManager()
    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]
    def __str__(self): return self.username

# --- POST MODELS ---

def get_post_media_path(instance, filename):
    ext = filename.split('.')[-1].lower()
    image_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    video_extensions = ['mp4', 'mov', 'avi', 'mkv', 'webm']
    media_type = "videos" if ext in video_extensions else "images" if ext in image_extensions else "others"
    return f"posts/{media_type}/{now().strftime('%Y/%m')}/{filename}"

class Profile(models.Model):
    # UUID as Primary Key for security/obfuscation
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Linking to your existing User model
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    
    # Fields for AC
    display_name = models.CharField(max_length=50, blank=True)
    bio = models.TextField(max_length=160, blank=True)
    
    # Timestamps (always good practice)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_private = models.BooleanField(default=False)

    def __str__(self):
        return f"Profile: {self.user.email} ({self.id})"


class Post(models.Model):
    MODERATION_CHOICES = [
        ("PENDING", "Pendente"),
        ("APPROVED", "Aprovado"),
        ("REJECTED", "Rejeitado")
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField(validators=[MaxLengthValidator(280)])
    media = models.FileField(upload_to=get_post_media_path, null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    
    # Campo essencial para o seu Overlay no React funcionar
    moderation_status = models.CharField(
        max_length=10, 
        choices=MODERATION_CHOICES, 
        default="PENDING"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    # Managers
    objects = PostManager()          # Manager padrão (Filtra deletados)
    all_objects = models.Manager()   # Manager completo (Para o Admin)

    # Sobrescreve o delete para o código geral
    def delete(self, force=False, *args, **kwargs):
        if force:
            super().delete(*args, **kwargs) # Apaga do banco
        else:
            self.is_deleted = True # Apenas esconde
            self.save()

    class Meta:
        ordering = ['-created_at']

    # Removido todo o processamento FFmpeg/Subprocess daqui.
    # O save() agora é o padrão do Django, sem risco de travar a RAM do Render.
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Post by {self.user.username} ({self.moderation_status})"
    
# --- SOCIAL MODELS ---

class Follow(models.Model):
    follower = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name="rel_follower"
    )
    following = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name="rel_following"
    )
    unfollowed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True) # Essencial para a regra de 48h

    class Meta:
        unique_together = ("follower", "following")

    def __str__(self):
        return f"{self.follower} follows {self.following}"


class Block(models.Model):
    blocker = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name="blocking_set"
    )
    blocked = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name="blocked_by_set"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("blocker", "blocked")

    def __str__(self):
        return f"{self.blocker} bloqueou {self.blocked}"

class Like(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='likes')
    post = models.ForeignKey('accounts.Post', on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Garante que um usuário só possa dar 1 like por post
        unique_together = ('user', 'post')

    def __str__(self):
        return f"{self.user.username} liked post {self.post.id}"