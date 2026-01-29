from django.db import migrations
import os

def create_admin(apps, schema_editor):
    User = apps.get_model("accounts", "User")

    if not User.objects.filter(username="admin").exists():
        User.objects.create_superuser(
            username="admin",
            email="admin@email.com",
            password=os.getenv("DJANGO_ADMIN_PASSWORD", "Lean@2026"),
        )

def reverse_create_admin(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(username="admin").delete()

class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0005_alter_user_provider"),
    ]

    operations = [
        migrations.RunPython(create_admin, reverse_create_admin),
    ]
