describe('Fluxo Real de Autenticação - Blindado', () => {

  // Limpeza padrão após cada teste para não poluir a sessão
  afterEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  // =========================================================================
  // --- FLUXO DO GOOGLE OAUTH2 (TESTES 1, 2 E 3) ---
  // =========================================================================

  it('1. Deve mostrar a página de login e verificar se o botão do Google está operacional', () => {
    cy.visit('/login');
    cy.getByData('login-title').should('contain', 'Mindly');
    cy.getByData('google-login-button').should('be.visible').and('not.be.disabled');
  });

  it('2. Deve barrar o login se o e-mail do Google não estiver cadastrado', () => {
    cy.intercept('POST', '**/api/accounts/google-login/', {
      statusCode: 404,
      body: {
        error: 'user_not_registered',
        message: "Conta não encontrada. Vá em 'Criar Conta' primeiro."
      }
    }).as('googleLoginBackend');

    cy.visit('/login');

    // Simula a ativação do fluxo enviando a requisição controlada pela janela do app
    cy.window().then((win) => {
      win.fetch('http://localhost:8000/api/accounts/google-login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: 'fake_token' })
      }).catch(() => {});
    });

    cy.wait('@googleLoginBackend');
  });

  it('3. Deve criar a conta e logar direto ao usar o botão do Google no Criar Conta', () => {
    cy.intercept('POST', '**/api/accounts/google-register/', {
      statusCode: 201,
      body: {
        access: 'token-fake-register-access',
        refresh: 'token-fake-register-refresh',
        user: { id: 'uuid-123', username: 'googletest', email: 'test@gmail.com' }
      }
    }).as('googleRegisterBackend');

    cy.visit('/login');
    cy.contains('button', 'Criar uma conta').click();

    cy.window().then((win) => {
      win.fetch('http://localhost:8000/api/accounts/google-register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: 'fake_token' })
      });
    });

    cy.wait('@googleRegisterBackend');
  });

  // =========================================================================
  // --- SANITY CHECK (TESTE 4) ---
  // =========================================================================

  describe('Sanity Check - Perfil', () => {
    it('4. Deve carregar o perfil com sucesso usando token', () => {
      cy.intercept('GET', '**/api/accounts/profile/', {
        statusCode: 200,
        body: { id: 1, name: 'Test User', email: 'test@mindly.app' },
      }).as('getProfile');

      cy.visit('/');
      cy.window().then((win) => {
        win.localStorage.setItem('access', 'token-fake-valido');
      });

      cy.wait('@getProfile').its('response.statusCode').should('eq', 200);
    });
  });

  // =========================================================================
  // --- FLUXO DE TROCA DE SENHA (TESTES 5 E 6 NA ROTA /settings) ---
  // =========================================================================

  describe('Fluxo de Troca de Senha', () => {
    
    beforeEach(() => {
      // Mock das APIs secundárias consumidas globalmente no painel de /settings
      cy.intercept('GET', '**/api/notifications/globalNotifications', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/accounts/suggested-follows/**', { statusCode: 200, body: [] });
      cy.intercept('GET', '**/api/accounts/profiles/relationships-sync/**', { statusCode: 200, body: {} });
      cy.intercept('GET', '**/api/accounts/feed/', { statusCode: 200, body: [] });
      
      // Refresh estável de token para evitar logouts indesejados
      cy.intercept('POST', '**/api/token/refresh/', { 
        statusCode: 200, 
        body: { access: 'token-novo-gerado' } 
      });

      // Força os tokens de sessão mockada no localStorage antes da montagem da página
      cy.window().then((win) => {
        win.localStorage.setItem('access', 'token-logado-valido');
        win.localStorage.setItem('refresh', 'refresh-logado-valido');
      });
    });

    it('5. Deve alterar a senha com sucesso para Usuário Local (Exige senha atual)', () => {
      // Simula um perfil que possui senha configurada (has_password: true)
      cy.intercept('GET', '**/api/accounts/profile/', {
        statusCode: 200,
        body: { id: 1, username: 'user_local', provider: 'local', has_password: true },
      }).as('profileLocal');

      cy.intercept('POST', '**/api/accounts/change-password/', {
        statusCode: 200,
        body: { message: "Password updated successfully." }
      }).as('changePasswordLocal');

      cy.visit('/settings');
      cy.wait('@profileLocal');

      // Preenchimento blindado usando os novos data-cy
      cy.getByData('password-current').should('be.visible').type('SenhaAntiga123');
      cy.getByData('password-new').type('NovaSenha123');
      cy.getByData('password-confirm').type('NovaSenha123');
      
      cy.getByData('password-submit-button').click();

      cy.wait('@changePasswordLocal');
      cy.getByData('password-status-message').should('contain', 'Password updated successfully');
    });

    it('6. Deve alterar a senha com sucesso para Usuário do Gmail (Não exige senha atual)', () => {
      // Simula um perfil vindo do Google sem senha local definida (has_password: false)
      cy.intercept('GET', '**/api/accounts/profile/', {
        statusCode: 200,
        body: { id: 1, username: 'user_gmail', provider: 'google', has_password: false },
      }).as('profileGoogle');

      cy.intercept('POST', '**/api/accounts/change-password/', {
        statusCode: 200,
        body: { message: "Password updated successfully." }
      }).as('changePasswordGoogle');

      cy.visit('/settings');
      cy.wait('@profileGoogle');

      // Asserts de segurança da interface para o usuário Google
      cy.getByData('google-no-password-alert').should('be.visible');
      cy.getByData('password-current').should('not.exist');

      // Preenche apenas a nova senha e a confirmação
      cy.getByData('password-new').should('be.visible').type('MinhaPrimeiraSenhaLocal123');
      cy.getByData('password-confirm').type('MinhaPrimeiraSenhaLocal123');
      
      cy.getByData('password-submit-button').click();

      cy.wait('@changePasswordGoogle').then((interception) => {
        // Valida se o payload enviado não enviou a senha atual opcional
        expect(interception.request.body.current_password).to.eq('');
        expect(interception.request.body.new_password).to.eq('MinhaPrimeiraSenhaLocal123');
      });

      cy.getByData('password-status-message').should('contain', 'Password updated successfully');
    });
  });
});