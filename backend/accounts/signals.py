import os
from django.db.models.signals import pre_save, post_delete, post_save
from django.dispatch import receiver
from .models import User, Profile, Follow, Like, Comment, Notification, Report

# --- Sinais de Imagem (Ajustados para evitar o erro NotImplementedError) ---

@receiver(pre_save, sender=Profile)
def delete_old_profile_picture(sender, instance, **kwargs):
    if not instance.pk:
        return
        
    try:
        # Busca a versão atual do perfil no banco antes de salvar a nova
        old_profile = Profile.objects.get(pk=instance.pk)
        old_photo = old_profile.profile_picture
    except Profile.DoesNotExist:
        return
        
    new_photo = instance.profile_picture
    
    # Se a foto mudou e não é a foto padrão, deletamos a antiga
    if old_photo and old_photo != new_photo:
        # Verificamos se não é o avatar padrão para não deletá-lo por engano
        if 'default-avatar.png' not in old_photo.name:
            try:
                # O método .delete(save=False) deleta o arquivo físico 
                # sem disparar um novo sinal de save, evitando loops.
                old_photo.delete(save=False)
            except Exception as e:
                print(f"Erro ao deletar foto antiga: {e}")

@receiver(post_delete, sender=Profile)
def delete_profile_picture_on_delete(sender, instance, **kwargs):
    """Deleta o arquivo físico quando o Profile é excluído do banco"""
    if instance.profile_picture and 'default-avatar.png' not in instance.profile_picture.name:
        try:
            instance.profile_picture.delete(save=False)
        except Exception as e:
            print(f"Erro ao deletar foto no delete: {e}")

# --- Sinais de Perfil e Notificações (Mantidos como estavam) ---

@receiver(post_save, sender=User)
def handle_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.get_or_create(user=instance)
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()

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
        if instance.post.user != instance.author:
            Notification.objects.create(
                recipient=instance.post.user,
                sender=instance.author,
                notification_type='COMMENT',
                post=instance.post
            )

@receiver(post_save, sender=Report)
def create_report_notifications(sender, instance, created, **kwargs):
    if created:
        return

    if instance.status not in ("resolved", "ignored"):
        return

    post = instance.post
    if not post:
        return

    snapshot = post.content

    if instance.status == "resolved":
        msg_reporter = "Denúncia aceite: O conteúdo foi removido por violar as nossas diretrizes."
        msg_owner = "Após análise da moderação, seu conteúdo foi removido por violar as diretrizes."
    else:
        msg_reporter = "Denúncia rejeitada: Analisámos o conteúdo e concluímos que NÃO viola as nossas diretrizes."
        msg_owner = "Uma denúncia sobre seu conteúdo foi rejeitada após análise da moderação."

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