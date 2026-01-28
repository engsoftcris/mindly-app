def save_user_social_data(backend, user, response, *args, **kwargs):
    """
    Esta função guarda o provedor e o nome completo, 
    seja Google ou Facebook.
    """
    # Define o provider baseado no backend que está a ser usado
    if backend.name == 'google-oauth2':
        user.provider = 'google'
    elif backend.name == 'facebook':
        user.provider = 'facebook'
    
    # Guarda o nome completo que vem do social
    if not user.full_name:
        # Google envia 'name', Facebook também
        user.full_name = response.get('name') or response.get('full_name')

    user.save()