def save_user_social_data(backend, user, response, *_args, **_kwargs):
    """
    Função de pipeline personalizada para o Python Social Auth.
    É executada durante o fluxo de autenticação social para capturar e salvar
    dados específicos vindos do provedor diretamente no objeto do usuário.
    """
    # Verifica se o login atual está sendo feito especificamente através do Google
    if backend.name == "google-oauth2":
        # Extrai o ID único do usuário no Google (campo 'sub' no payload do OpenID Connect)
        google_id = response.get("sub")

        # só define provider na criação inicial
        # Evita sobrescrever o provedor caso o usuário já possua um definido
        if not user.provider:
            user.provider = "google"

        # vincula Google à conta
        # Salva o ID social do Google no usuário, caso ele ainda não tenha um vinculado
        if google_id and not user.social_id:
            user.social_id = google_id

    # Caso o usuário ainda não tenha o nome completo preenchido no sistema
    if not user.full_name:
        # Tenta capturar o nome do payload usando as chaves 'name' ou 'full_name'
        user.full_name = response.get("name") or response.get("full_name")

    # Salva as alterações no banco de dados
    # O 'update_fields' otimiza a query, atualizando apenas as colunas especificadas
    user.save(update_fields=["provider", "social_id", "full_name"])
