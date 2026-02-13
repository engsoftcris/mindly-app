import os
from django.db.models.signals import pre_save, post_delete, post_save
from django.dispatch import receiver
from .models import User, Profile

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
@receiver(post_save, sender=User)
def handle_user_profile(sender, instance, created, **kwargs):
    """
    Combined signal to handle Profile creation and updates.
    """
    if created:
        # Create the profile if the user is new
        Profile.objects.get_or_create(user=instance)
    else:
        # Save the profile only if it already exists
        if hasattr(instance, 'profile'):
            instance.profile.save()

@receiver(post_delete, sender=User)
def delete_profile_picture_on_delete(sender, instance, **kwargs):
    if instance.profile_picture:
        if instance.profile_picture.path and os.path.isfile(instance.profile_picture.path):
            os.remove(instance.profile_picture.path)
