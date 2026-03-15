from django.db.models.signals import pre_save, post_delete, post_save
from django.dispatch import receiver
from .models import User, Profile, Follow, Like, Comment, Notification, Report

# pylint: disable=unused-argument

# --- Sinais de Imagem ---


@receiver(pre_save, sender=Profile)
def delete_old_profile_picture(sender, instance, **kwargs):
    """Deleta a imagem antiga quando uma nova é enviada."""
    if not instance.pk:
        return

    try:
        old_profile = Profile.objects.get(pk=instance.pk)
        old_photo = old_profile.profile_picture
    except Profile.DoesNotExist:
        return

    new_photo = instance.profile_picture

    if old_photo and old_photo != new_photo:
        if old_photo.name and "default-avatar.png" not in old_photo.name:
            try:
                old_photo.delete(save=False)
            except Exception:  # pylint: disable=broad-exception-caught
                pass


@receiver(post_delete, sender=Profile)
def delete_profile_picture_on_delete(sender, instance, **kwargs):
    """Deleta o arquivo físico quando o Profile é excluído."""
    if (
        instance.profile_picture
        and "default-avatar.png" not in instance.profile_picture.name
    ):
        try:
            instance.profile_picture.delete(save=False)
        except Exception:  # pylint: disable=broad-exception-caught
            pass


# --- Sinais de Perfil e Notificações ---


@receiver(post_save, sender=User)
def handle_user_profile(sender, instance, created, **kwargs):
    """Cria ou atualiza o perfil vinculado ao usuário."""
    if created:
        Profile.objects.get_or_create(user=instance)
    else:
        if hasattr(instance, "profile"):
            instance.profile.save()


@receiver(post_save, sender=Follow)
def create_follow_notification(sender, instance, created, **kwargs):
    """Notifica o usuário quando ele recebe um novo seguidor."""
    if created:
        Notification.objects.create(
            recipient=instance.following,
            sender=instance.follower,
            notification_type="FOLLOW",
        )


@receiver(post_save, sender=Like)
def create_like_notification(sender, instance, created, **kwargs):
    """Notifica o dono do post sobre um novo like."""
    if created and instance.post.user != instance.user:
        Notification.objects.create(
            recipient=instance.post.user,
            sender=instance.user,
            notification_type="LIKE",
            post=instance.post,
        )


@receiver(post_save, sender=Comment)
def create_comment_notification(sender, instance, created, **kwargs):
    """Notifica o dono do post sobre um novo comentário."""
    if created and instance.post.user != instance.author:
        Notification.objects.create(
            recipient=instance.post.user,
            sender=instance.author,
            notification_type="COMMENT",
            post=instance.post,
        )


@receiver(post_save, sender=Report)
def create_report_notifications(sender, instance, created, **kwargs):
    """Gera notificações de resolução ou rejeição de denúncias."""
    if created or instance.status not in ("resolved", "ignored"):
        return

    post = instance.post
    if not post:
        return

    snapshot = post.content

    if instance.status == "resolved":
        msg_reporter = (
            "Denúncia aceite: O conteúdo foi removido por violar as nossas diretrizes."
        )
        msg_owner = "Após análise da moderação, seu conteúdo foi removido por violar as diretrizes."
    else:
        msg_reporter = "Denúncia rejeitada: Analisámos o conteúdo e concluímos que NÃO viola as nossas diretrizes."
        msg_owner = (
            "Uma denúncia sobre seu conteúdo foi rejeitada após análise da moderação."
        )

    def upsert_report_update(recipient, text):
        Notification.objects.filter(
            recipient=recipient,
            notification_type="REPORT_UPDATE",
            post=post,
            text=text,
        ).delete()

        Notification.objects.create(
            recipient=recipient,
            sender=None,
            notification_type="REPORT_UPDATE",
            text=text,
            post=post,
            stored_post_content=snapshot,
        )

    upsert_report_update(instance.reporter, msg_reporter)

    if post.user_id != instance.reporter_id:
        upsert_report_update(post.user, msg_owner)
