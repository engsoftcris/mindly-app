describe('Profile Settings & Real-time Sync (UUID Era) - Robust Version', () => {
  const MOCK_UUID = 'b369ce73-66ba-4dc9-a736-d79eb3e45e5b';
  const USERNAME = 'cristiano.tobias40';

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
      image_status: 'APPROVED'
    };

    // 1. Mocks de Autenticação e Perfil (APENAS A ROTA OFICIAL AGORA)
    cy.intercept('GET', '**/api/accounts/profile/', { 
      statusCode: 200, 
      body: initialProfile 
    }).as('getProfile');

    // 2. Mock de Notificações
    cy.intercept('GET', '**/api/notifications/', { 
      statusCode: 200, 
      body: [] 
    }).as('getNotifications');

    // Visita a página de SETTINGS
    visitAuthed('/settings');

    // Espera o carregamento inicial dos dados na rota correta
    cy.wait('@getProfile');
  });

  it('1. Deve exibir o nome "Cristiano" na Navbar (extraído do display_name)', () => {
    cy.get('[data-cy="navbar-user-display-name"]', { timeout: 12000 })
      .should('be.visible')
      .and('contain', 'Cristiano');

    cy.get('[data-cy="navbar-user-username"]')
      .should('be.visible')
      .and('contain', USERNAME);
  });

  it('2. Sync Test: Deve atualizar para "Ricardo" e refletir na Navbar instantaneamente', () => {
    const newFullName = 'Ricardo Silva Pro';

    // Mock do PATCH na rota oficial sem o /me/
    cy.intercept('PATCH', '**/api/accounts/profile/', {
      delay: 500,
      statusCode: 200,
      body: {
        id: MOCK_UUID,
        username: USERNAME,
        display_name: newFullName,
        bio: 'Nova bio do Ricardo',
      },
    }).as('updateProfile');

    cy.get('[data-cy="settings-input-display-name"]')
      .should('be.visible')
      .clear()
      .type(newFullName);

    cy.get('[data-cy="settings-input-bio"]')
      .clear()
      .type('Nova bio do Ricardo');

    cy.get('[data-cy="settings-submit-button"]').click();

    // Valida estado de "Saving..."
    cy.get('[data-cy="settings-submit-button"]').should('contain', 'Saving...');

    cy.wait('@updateProfile');

    cy.get('[data-cy="settings-status-message"]')
      .should('be.visible')
      .and('contain', 'Settings updated successfully!');

    // Valida sincronização na Navbar
    cy.get('[data-cy="navbar-user-display-name"]')
      .should('contain', 'Ricardo');
  });

 it('3. Persistência: Deve manter o nome "Ricardo" ao navegar para a Home', () => {
    const updatedName = 'Ricardo Silva Pro';
    
    cy.intercept('GET', '**/api/accounts/profile/', {
      statusCode: 200,
      body: { id: MOCK_UUID, username: USERNAME, display_name: updatedName },
    }).as('getProfileRicardo');

    cy.intercept('GET', '**/api/posts/**', {
      statusCode: 200,
      body: { results: [] },
    }).as('getPosts');

    cy.get('[data-cy="navbar-home-link"]').click();

    cy.url().should('eq', `${Cypress.config().baseUrl}/`);
    cy.wait('@getPosts');

    cy.get('[data-cy="navbar-user-display-name"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain', 'Ricardo');
  });
});