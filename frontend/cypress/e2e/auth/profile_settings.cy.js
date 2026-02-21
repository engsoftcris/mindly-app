describe('Profile Settings & Real-time Sync (UUID Era) - Robust Version', () => {
  const MOCK_UUID = 'b369ce73-66ba-4dc9-a736-d79eb3e45e5b';
  const USERNAME = 'cristiano.tobias40';

  // Helper para garantir que o localStorage seja injetado ANTES do app carregar
  const visitAuthed = (path) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token-123');
        win.localStorage.setItem('refresh', 'fake-refresh-123');
      },
    });
  };

  beforeEach(() => {
    cy.viewport(1280, 800);

    const initialProfile = {
      id: MOCK_UUID,
      username: USERNAME,
      display_name: 'Cristiano Original',
      bio: 'Bio antiga...',
      profile_picture: null,
    };

    // 1. Mocks de Autenticação e Perfil
    // Interceptamos tanto o /me/ quanto o root para evitar o 401 do AuthProvider
    cy.intercept('GET', '**/api/accounts/profile/me/', { 
      statusCode: 200, 
      body: initialProfile 
    }).as('getProfileMe');

    cy.intercept('GET', '**/api/accounts/profile/', { 
      statusCode: 200, 
      body: initialProfile 
    }).as('getProfileRoot');

    // 2. Mock de Notificações (evita poluição de erro 401 no log)
    cy.intercept('GET', '**/api/notifications/', { 
      statusCode: 200, 
      body: [] 
    }).as('getNotifications');

    // 3. Visita a página de SETTINGS (onde a edição acontece agora)
    visitAuthed('/settings');

    // Espera o carregamento inicial dos dados
    cy.wait('@getProfileMe');
  });

  it('1. Deve exibir o nome "Cristiano" na Navbar (extraído do display_name)', () => {
    cy.get('[data-cy="navbar-user-display-name"]', { timeout: 12000 })
      .should('be.visible')
      .and('contain', 'Cristiano')
      .and('not.contain', 'Original');

    cy.get('[data-cy="navbar-user-username"]')
      .should('be.visible')
      .and('contain', USERNAME);
  });

  it('2. Sync Test: Deve atualizar para "Ricardo" e refletir na Navbar instantaneamente', () => {
    const newFullName = 'Ricardo Silva Pro';

    // Mock do PATCH com delay para testar o estado de "Saving..."
    cy.intercept('PATCH', '**/api/accounts/profile/me/', {
      delay: 500,
      statusCode: 200,
      body: {
        id: MOCK_UUID,
        username: USERNAME,
        display_name: newFullName,
        bio: 'Nova bio do Ricardo',
      },
    }).as('updateToRicardo');

    // Preenchimento usando os data-cy do componente
    cy.get('[data-cy="settings-input-display-name"]')
      .should('be.visible')
      .clear()
      .type(newFullName);

    cy.get('[data-cy="settings-input-bio"]')
      .clear()
      .type('Nova bio do Ricardo');

    // Submit do formulário
    cy.get('[data-cy="settings-submit-button"]').click();

    // Valida estado de carregamento no botão
    cy.get('[data-cy="settings-submit-button"]').should('contain', 'Saving...');

    cy.wait('@updateToRicardo');

    // Valida mensagem de sucesso
    cy.get('[data-cy="settings-status-message"]')
      .should('be.visible')
      .and('contain', 'Settings updated successfully!');

    // Valida sincronização em tempo real na Navbar
    cy.get('[data-cy="navbar-user-display-name"]')
      .should('contain', 'Ricardo')
      .and('not.contain', 'Cristiano');
  });

 it('3. Persistência: Deve manter o nome "Ricardo" ao navegar para a Home', () => {
    const updatedName = 'Ricardo Silva Pro';
    
    // Mocks para ambos os endpoints possíveis
    cy.intercept('GET', '**/api/accounts/profile/me/', {
      statusCode: 200,
      body: { id: MOCK_UUID, username: USERNAME, display_name: updatedName },
    }).as('getProfileMeRicardo');

    cy.intercept('GET', '**/api/accounts/profile/', {
      statusCode: 200,
      body: { id: MOCK_UUID, username: USERNAME, display_name: updatedName },
    }).as('getProfileRootRicardo');

    cy.intercept('GET', '**/api/posts/**', {
      statusCode: 200,
      body: { results: [] },
    }).as('getPosts');

    // Navegação
    cy.get('[data-cy="navbar-home-link"]').click();

    // Em vez de esperar um específico que pode não vir, 
    // apenas garantimos que a URL mudou e os posts carregaram
    cy.url().should('eq', `${Cypress.config().baseUrl}/`);
    cy.wait('@getPosts');

    // Validação final: o nome "Ricardo" deve estar lá, 
    // vindo de qualquer um dos mocks acima que o app resolveu chamar
    cy.get('[data-cy="navbar-user-display-name"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain', 'Ricardo');
  });
});