import os
from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver
from .models import User

# --- Sinais de Imagem ---

@receiver(pre_save, sender=User)
def delete_old_profile_picture(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old = sender.objects.get(pk=instance.pk).profile_picture
    except sender.DoesNotExist:
        return
    new = instance.profile_picture
    if old and old != new:
        if old.path and os.path.isfile(old.path):
            os.remove(old.path)

@receiver(post_delete, sender=User)
def delete_profile_picture_on_delete(sender, instance, **kwargs):
    if instance.profile_picture:
        if instance.profile_picture.path and os.path.isfile(instance.profile_picture.path):
            os.remove(instance.profile_picture.path)
