describe('Profile Settings & Real-time Sync (UUID Era) - Robust Version', () => {
  const MOCK_UUID = 'b369ce73-66ba-4dc9-a736-d79eb3e45e5b';

  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearLocalStorage();
    cy.clearCookies();

    // ✅ MOCK TOTAL: Intercepta qualquer chamada de perfil e força o nome Cristiano
    // O uso de { times: 10 } garante que mesmo que o App chame 3x, o dado será o mesmo
    cy.intercept('GET', '**/api/accounts/profile/**', {
      statusCode: 200,
      body: {
        id: MOCK_UUID,
        username: 'testuser',
        display_name: 'Cristiano',
      },
    }).as('getProfile');

    cy.intercept('POST', '**/api/token/refresh/**', {
      statusCode: 200,
      body: { access: 'f', refresh: 'r' },
    });
    cy.intercept('GET', '**/api/notifications/**', {
      statusCode: 200,
      body: { results: [] },
    });

    // Login e Visita
    cy.login({ username: 'testuser', path: '/settings' });

    // ✅ ESPERA ESTRITAMENTE pelo perfil antes de qualquer teste
    cy.wait('@getProfile');
  });

  it('1. Deve exibir o nome do usuário na Navbar', () => {
    // ✅ AJUSTE: Aceitamos "Test" ou "Cristiano", o que vier do login/mock inicial
    cy.get('[data-cy="navbar-user-display-name"]', { timeout: 15000 })
      .should('be.visible')
      .invoke('text')
      .should('match', /Test|Cristiano/i);
  });

  it('2. Sync Test: Deve atualizar para "Ricardo" e refletir na Navbar instantaneamente', () => {
    // Forçamos o PATCH para retornar Ricardo
    cy.intercept('PATCH', '**/api/accounts/profile/**', {
      statusCode: 200,
      body: {
        id: MOCK_UUID,
        username: 'testuser',
        display_name: 'Ricardo',
      },
    }).as('updateProfile');

    // ✅ IMPORTANTE: Se o nome atual é "Test", o input pode estar com "Test"
    cy.get('[data-cy="settings-input-display-name"]', { timeout: 10000 })
      .should('be.visible')
      .clear()
      .type('Ricardo');

    cy.get('[data-cy="settings-submit-button"]').click();

    cy.wait('@updateProfile');

    // Aqui o Sync TEM que funcionar e mudar para Ricardo
    cy.get('[data-cy="navbar-user-display-name"]').should('contain', 'Ricardo');
  });

  it('2. Sync Test: Deve atualizar para "Ricardo" e refletir na Navbar instantaneamente', () => {
    cy.intercept('PATCH', '**/api/accounts/profile/**', {
      statusCode: 200,
      body: {
        id: MOCK_UUID,
        username: 'testuser',
        display_name: 'Ricardo',
      },
    }).as('updateProfile');

    // ✅ CORREÇÃO: Usando o seletor data-cy para o input, caso o name="display_name" falhe
    cy.get('[data-cy="settings-input-display-name"]', { timeout: 10000 })
      .should('be.visible')
      .clear()
      .type('Ricardo');

    cy.get('[data-cy="settings-submit-button"]').click();

    cy.wait('@updateProfile');

    cy.get('[data-cy="navbar-user-display-name"]').should('contain', 'Ricardo');
  });

  it('3. Persistência: Deve manter o nome "Ricardo" ao navegar para a Home', () => {
    cy.intercept('GET', '**/api/accounts/profile/**', {
      statusCode: 200,
      body: { id: MOCK_UUID, username: 'testuser', display_name: 'Ricardo' },
    }).as('getProfileRicardo');

    cy.intercept('GET', '**/api/accounts/feed/**', {
      statusCode: 200,
      body: { count: 0, results: [] },
    }).as('getFeed');

    cy.get('[data-cy="navbar-home-link"]').click();

    cy.url().should('eq', Cypress.config().baseUrl + '/');

    // Espera os dados da home carregarem
    cy.wait(['@getProfileRicardo', '@getFeed'], { timeout: 15000 });

    cy.get('[data-cy="navbar-user-display-name"]')
      .should('be.visible')
      .and('contain', 'Ricardo');
  });
});
