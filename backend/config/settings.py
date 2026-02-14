from pathlib import Path
import os
from datetime import timedelta
import dj_database_url

# --------------------------------------------------
# BASE & DEBUG
# --------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "django-insecure-dev-key-change-in-production")
DEBUG = os.getenv("DEBUG", "").lower() in ("1", "true", "yes", "on")

# --------------------------------------------------
# SECURITY & CORS
# --------------------------------------------------
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0,backend,app").split(",")

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]
    frontend_env = os.getenv("FRONTEND_URL")
    if frontend_env:
        CORS_ALLOWED_ORIGINS.append(frontend_env)

CORS_ALLOW_CREDENTIALS = True

# --------------------------------------------------
# APPLICATIONS
# --------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "social_django",
    "accounts.apps.AccountsConfig",
    "storages",
]

# --------------------------------------------------
# MIDDLEWARE
# --------------------------------------------------
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# --------------------------------------------------
# TEMPLATES
# --------------------------------------------------
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "social_django.context_processors.backends",
                "social_django.context_processors.login_redirect",
            ],
        },
    },
]

# --------------------------------------------------
# DATABASE
# --------------------------------------------------
default_db_url = os.getenv(
    "DATABASE_URL",
    f"postgresql://{os.getenv('DB_USER', 'mindly_admin')}:{os.getenv('DB_PASSWORD', 'mindly_pass')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME', 'mindly_db')}"
)
DATABASES = {
    "default": dj_database_url.config(default=default_db_url, conn_max_age=600, conn_health_checks=True)
}

# --------------------------------------------------
# AUTH & JWT
# --------------------------------------------------
AUTH_USER_MODEL = "accounts.User"
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework_simplejwt.authentication.JWTAuthentication"],
}
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# --------------------------------------------------
# SOCIAL AUTH
# --------------------------------------------------
AUTHENTICATION_BACKENDS = (
    "social_core.backends.google.GoogleOAuth2",
    "social_core.backends.facebook.FacebookAppOAuth2",
    "django.contrib.auth.backends.ModelBackend",
)
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = os.getenv("GOOGLE_CLIENT_ID")
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SOCIAL_AUTH_FACEBOOK_KEY = os.getenv("FACEBOOK_CLIENT_ID")
SOCIAL_AUTH_FACEBOOK_SECRET = os.getenv("FACEBOOK_CLIENT_SECRET")
SOCIAL_AUTH_FACEBOOK_SCOPE = ['email']
SOCIAL_AUTH_FACEBOOK_PROFILE_EXTRA_PARAMS = {'fields': 'id, name, email'}

SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.user.get_username',
    'social_core.pipeline.social_auth.associate_by_email',
    'social_core.pipeline.user.create_user',
    'accounts.pipeline.save_user_social_data',
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
)

# --------------------------------------------------
# STATIC FILES (WHITENOISE)
# --------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
STATICFILES_DIRS = [os.path.join(BASE_DIR, "static")]
WHITENOISE_USE_FINDERS = True

# --------------------------------------------------
# STORAGE (SUPABASE S3)
# --------------------------------------------------
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")

if AWS_ACCESS_KEY_ID:
    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
    AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "us-east-1")
    AWS_S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT_URL", "").rstrip("/")
    AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME")

    # django-storages / boto3
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False          # URLs sem assinatura
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_ADDRESSING_STYLE = "path"
    AWS_S3_SIGNATURE_VERSION = "s3v4"

    from storages.backends.s3boto3 import S3Boto3Storage

    def _supabase_public_base(endpoint: str) -> str:
        """
        endpoint exemplo:
          https://<project>.storage.supabase.co/storage/v1/s3
        retorno:
          https://<project>.supabase.co
        """
        if not endpoint:
            raise RuntimeError(
                "AWS_S3_ENDPOINT_URL vazio. Ex: https://<project>.storage.supabase.co/storage/v1/s3"
            )

        base = endpoint.split("/storage/v1/s3")[0].rstrip("/")
        base = base.replace(".storage.supabase.co", ".supabase.co")
        return base

    SUPABASE_PUBLIC_BASE = _supabase_public_base(AWS_S3_ENDPOINT_URL)

    class SupabasePublicStorage(S3Boto3Storage):
        """
        Força URL pública:
          https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
        """
        def url(self, name, parameters=None, expire=None, http_method=None):
            name = str(name).lstrip("/")
            return f"{SUPABASE_PUBLIC_BASE}/storage/v1/object/public/{AWS_STORAGE_BUCKET_NAME}/{name}"

    STORAGES = {
        "default": {"BACKEND": "config.settings.SupabasePublicStorage"},
        "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
    }

    # Compatibilidade (algumas libs ainda leem isso)
    DEFAULT_FILE_STORAGE = "config.settings.SupabasePublicStorage"

    # MEDIA_URL só para prefixo (o FileField.url usa storage.url())
    MEDIA_URL = f"{SUPABASE_PUBLIC_BASE}/storage/v1/object/public/{AWS_STORAGE_BUCKET_NAME}/"

else:
    STORAGES = {
        "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
        "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
    }
    DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"
    MEDIA_URL = "/media/"
    MEDIA_ROOT = os.path.join(BASE_DIR, "media")


    
# --------------------------------------------------
# FINAL CONFIGS
# --------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"


# Uploads: evita carregar arquivos grandes em RAM
# 15 MB em bytes
MAX_UPLOAD_SIZE = 15 * 1024 * 1024  # 15.728.640 bytes

# Arquivos maiores que 2.5MB vão para arquivo temporário (não RAM)
FILE_UPLOAD_MAX_MEMORY_SIZE = 2_621_440  # 2.5MB

# Limite total do request (vídeo máximo permitido)
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE