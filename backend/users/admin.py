from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

# Isso faz com que o seu User customizado apareça no painel
admin.site.register(User, UserAdmin)