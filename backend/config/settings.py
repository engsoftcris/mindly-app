from pathlib import Path
import os
from datetime import timedelta
import dj_database_url

# --------------------------------------------------
# BASE
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-dev-key-change-in-production"
)

# --------------------------------------------------
# CORS
# --------------------------------------------------
DEBUG = os.getenv("DEBUG", "True") == "True"

if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    # Garante que a lista comece apenas com valores válidos
    CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]
    
    frontend_env = os.getenv("FRONTEND_URL")
    if frontend_env:
        CORS_ALLOWED_ORIGINS.append(frontend_env)

# Mantém esta linha, ela é importante para o JWT/Cookies
CORS_ALLOW_CREDENTIALS = True

# --------------------------------------------------
# SECURITY
# --------------------------------------------------

# Se a env existir, divide por vírgula. Se não, usa o padrão seguro para dev.
ALLOWED_HOSTS = os.getenv(
    "ALLOWED_HOSTS", 
    "localhost,127.0.0.1,0.0.0.0,backend,app"
).split(",")


# --------------------------------------------------
# APPLICATIONS
# --------------------------------------------------

INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "social_django",

    # Local
    "accounts.apps.AccountsConfig",
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


# --------------------------------------------------
# URL / WSGI
# --------------------------------------------------

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

                # social-auth
                "social_django.context_processors.backends",
                "social_django.context_processors.login_redirect",
            ],
        },
    },
]


# --------------------------------------------------
# DATABASE
# --------------------------------------------------

# Se existir DATABASE_URL (no Staging/Render/Actions), ele usa-a.
# Se não existir, ele monta a URL com os teus os.getenv locais.
default_db_url = os.getenv(
    "DATABASE_URL",
    f"postgresql://{os.getenv('DB_USER', 'mindly_admin')}:{os.getenv('DB_PASSWORD', 'mindly_pass')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '5432')}/{os.getenv('DB_NAME', 'mindly_db')}"
)

DATABASES = {
    "default": dj_database_url.config(
        default=default_db_url,
        conn_max_age=600,
        conn_health_checks=True,
    )
}


# --------------------------------------------------
# AUTH / USER
# --------------------------------------------------

AUTH_USER_MODEL = "accounts.User"

AUTHENTICATION_BACKENDS = (
    "social_core.backends.google.GoogleOAuth2",
    "social_core.backends.facebook.FacebookAppOAuth2",
    "django.contrib.auth.backends.ModelBackend",
)

LOGIN_REDIRECT_URL = "/"
LOGOUT_REDIRECT_URL = "/"


# --------------------------------------------------
# PASSWORD VALIDATORS
# (mantidos por compatibilidade, mas não usados)
# --------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# --------------------------------------------------
# REST FRAMEWORK / JWT
# --------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "AUTH_HEADER_TYPES": ("Bearer",),
}


# --------------------------------------------------
# SOCIAL AUTH — GOOGLE
# --------------------------------------------------

SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = os.getenv("GOOGLE_CLIENT_ID")
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

# --------------------------------------------------
# SOCIAL AUTH — FACEBOOK
# ---
SOCIAL_AUTH_FACEBOOK_KEY = os.getenv("FACEBOOK_CLIENT_ID")
SOCIAL_AUTH_FACEBOOK_SECRET = os.getenv("FACEBOOK_CLIENT_SECRET")
SOCIAL_AUTH_FACEBOOK_SCOPE = ['email']
SOCIAL_AUTH_FACEBOOK_PROFILE_EXTRA_PARAMS = {
    'fields': 'id, name, email'
}

SOCIAL_AUTH_USER_MODEL = "accounts.User"

SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.user.get_username',
    'social_core.pipeline.social_auth.associate_by_email',
    'social_core.pipeline.user.create_user',
    'accounts.pipeline.save_user_social_data', # Criaremos esta função abaixo
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
)

SOCIAL_AUTH_GOOGLE_OAUTH2_EXTRA_DATA = [
    ("email", "email"),
    ("name", "full_name"),
]


# --------------------------------------------------
# INTERNATIONALIZATION
# --------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# --------------------------------------------------
# STATIC / MEDIA
# --------------------------------------------------

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles")
STATICFILES_DIRS = [os.path.join(BASE_DIR, "static")]


MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR, "media")

WHITENOISE_USE_FINDERS = True
# --------------------------------------------------
# SECURITY HEADERS
# --------------------------------------------------

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"


# --------------------------------------------------
# EMAIL (DEV)
# --------------------------------------------------

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"


