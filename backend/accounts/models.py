import subprocess
import os
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models
from django.utils.timezone import now
from django.core.validators import MaxLengthValidator

def process_video_ffmpeg(file_path):
    """
    Uses the FFmpeg installed in Docker to:
    1. Cut to 15s
    2. Convert to H.264 (Universal MP4)
    """
    # Safe way to create a temp name
    base, ext = os.path.splitext(file_path)
    temp_output = f"{base}_tmp{ext}"
    
    command = [
        'ffmpeg', '-i', file_path,
        '-t', '15',                # Limit to 15s
        '-c:v', 'libx264',         # Compatible codec
        '-preset', 'veryfast',
        '-crf', '28',              # Quality control
        '-c:a', 'aac',
        '-y', temp_output          
    ]
    
    try:
        subprocess.run(command, check=True, capture_output=True)
        if os.path.exists(temp_output):
            os.replace(temp_output, file_path) 
    except Exception as e:
        print(f"FFmpeg Error: {e}")

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
    is_private = models.BooleanField(default=False)
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

class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField(validators=[MaxLengthValidator(280)])
    media = models.FileField(upload_to=get_post_media_path, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.media:
            file_path = self.media.path
            extension = os.path.splitext(file_path)[1].lower()
            if extension in ['.mp4', '.mov', '.avi', '.webm', '.mkv']:
                process_video_ffmpeg(file_path)