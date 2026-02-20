import os
from django.db.models.signals import pre_save, post_delete, post_save
from django.dispatch import receiver
from .models import User, Profile, Follow, Like, Comment, Notification

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

# --- Sinais de Notificações (TAL-15) ---

@receiver(post_save, sender=Follow)
def create_follow_notification(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            recipient=instance.following,
            sender=instance.follower,
            notification_type='FOLLOW'
        )

@receiver(post_save, sender=Like)
def create_like_notification(sender, instance, created, **kwargs):
    if created:
        # Só cria notificação se o dono do post não for quem deu o like
        if instance.post.user != instance.user:
            Notification.objects.create(
                recipient=instance.post.user,
                sender=instance.user,
                notification_type='LIKE',
                post=instance.post
            )

@receiver(post_save, sender=Comment)
def create_comment_notification(sender, instance, created, **kwargs):
    if created:
        # Só cria notificação se o autor do comentário não for o dono do post
        if instance.post.user != instance.author:
            Notification.objects.create(
                recipient=instance.post.user,
                sender=instance.author,
                notification_type='COMMENT',
                post=instance.post
            )