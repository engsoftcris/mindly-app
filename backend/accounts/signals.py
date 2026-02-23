import os
from django.db.models.signals import pre_save, post_delete, post_save
from django.dispatch import receiver
from .models import User, Profile, Follow, Like, Comment, Notification, Report

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
# --- Sinal de Notificação de Report (TAL-23) ---

@receiver(post_save, sender=Report)
def create_report_notifications(sender, instance, created, **kwargs):
    # Só notifica em atualização (não na criação)
    if created:
        return

    if instance.status not in ("resolved", "ignored"):
        return

    post = instance.post
    if not post:
        return

    snapshot = post.content  # conteúdo no momento da atualização

    # Mensagens (separadas por público)
    if instance.status == "resolved":
        msg_reporter = "Denúncia aceite: O conteúdo foi removido por violar as nossas diretrizes."
        msg_owner = "Após análise da moderação, seu conteúdo foi removido por violar as diretrizes."
    else:  # ignored
        msg_reporter = "Denúncia rejeitada: Analisámos o conteúdo e concluímos que NÃO viola as nossas diretrizes."
        msg_owner = "Uma denúncia sobre seu conteúdo foi rejeitada após análise da moderação."

    # Helper: cria/atualiza 1 notificação por (recipient, post, status)
    def upsert_report_update(recipient, text):
        Notification.objects.filter(
            recipient=recipient,
            notification_type="REPORT_UPDATE",
            post=post,
            text=text,
        ).delete()

        Notification.objects.create(
            recipient=recipient,
            sender=None,  # SYSTEM
            notification_type="REPORT_UPDATE",
            text=text,
            post=post,
            stored_post_content=snapshot,
        )

    # 1) Notifica o denunciante
    upsert_report_update(instance.reporter, msg_reporter)

    # 2) Notifica o autor do post (se for outra pessoa)
    if post.user_id != instance.reporter_id:
        upsert_report_update(post.user, msg_owner)