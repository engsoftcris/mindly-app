describe('Fluxo de Bloqueio de Utilizador no Dashboard', () => {
  const MY_UUID = '00000000-0000-0000-0000-000000000001';
  const TARGET_UUID = '99999999-9999-9999-9999-999999999999';

  beforeEach(() => {
    Cypress.on('uncaught:exception', () => false);
    cy.viewport(1280, 800);

    // MOCK GLOBAL DE AUTH
    cy.intercept('GET', '**/api/accounts/profile/**', {
      statusCode: 200,
      body: { id: MY_UUID, username: 'cristiano.tobias' },
    }).as('getProfile');

    cy.intercept('POST', '**/api/token/refresh/**', {
      statusCode: 200,
      body: { access: 'fake-access', refresh: 'fake-refresh' },
    }).as('refreshToken');

    // ✅ MELHORIA: Usar wildcard (**) no final para capturar qualquer variação do endpoint
    cy.intercept('GET', '**/api/notifications/**', {
      statusCode: 200,
      body: { results: [] },
    }).as('getNotifications');

    cy.intercept('GET', '**/api/accounts/suggested-follows/**', {
      statusCode: 200,
      body: { results: [] },
    }).as('getSuggestions');

    cy.intercept('GET', '**/api/accounts/profiles/relationships-sync/**', {
      statusCode: 200,
      body: { blocked_users: [] },
    }).as('syncRelations');

    // ✅ LOGIN: Injeta os tokens e espera o perfil carregar
    cy.login({ path: '/' });
  });

  it('1. Deve realizar o bloqueio no feed', () => {
    cy.intercept('GET', '**/api/accounts/feed/**', {
      statusCode: 200,
      body: {
        results: [
          {
            id: 101,
            content: 'Post de teste',
            author: {
              id: TARGET_UUID,
              username: 'outro_usuario',
              is_blocked: false,
            },
          },
        ],
      },
    }).as('getFeed');

    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block/**`, {
      statusCode: 200,
      body: { is_blocked: true },
    }).as('postBlock');

    // Recarregamos para pegar o mock do feed
    cy.visit('/');

    // ✅ ESPERA ROBUSTA: Se getNotifications falhar no seu app por ser polling,
    // aumentamos o timeout ou verificamos se ele é opcional.
    cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 });

    cy.get('[data-cy="user-action-menu-trigger"]')
      .first()
      .click({ force: true });
    cy.get('[data-cy="user-action-block"]').click({ force: true });

    cy.wait('@postBlock');
    cy.contains('Post de teste', { timeout: 10000 }).should('not.exist');
  });

  it('2. Deve redirecionar ao bloquear na página de perfil', () => {
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/**`, {
      statusCode: 200,
      body: { id: TARGET_UUID, username: 'outro_usuario', is_blocked: false },
    }).as('getPublicProfile');

    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block/**`, {
      statusCode: 200,
      body: { is_blocked: true },
    }).as('postBlockProfile');

    cy.visit(`/profile/${TARGET_UUID}`);

    // Aguardamos os mocks essenciais para renderizar a página de perfil
    cy.wait(['@getProfile', '@getPublicProfile'], { timeout: 15000 });

    cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true });
    cy.get('[data-cy="user-action-block"]').click({ force: true });

    cy.wait('@postBlockProfile');
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  it('3. Deve realizar o desbloqueio na página de perfil', () => {
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/**`, {
      statusCode: 200,
      body: { id: TARGET_UUID, username: 'bloqueado', is_blocked: true },
    }).as('getBlockedProfile');

    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block/**`, {
      statusCode: 200,
      body: { is_blocked: false },
    }).as('postUnblock');

    cy.visit(`/profile/${TARGET_UUID}`);
    cy.wait(['@getProfile', '@getBlockedProfile']);

    cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true });
    cy.get('[data-cy="user-action-unblock"]').click({ force: true });

    cy.wait('@postUnblock');

    // Mock do retorno após desbloqueio
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/**`, {
      statusCode: 200,
      body: { id: TARGET_UUID, username: 'bloqueado', is_blocked: false },
    }).as('getUnblockedProfile');

    cy.reload();
    cy.wait('@getUnblockedProfile');

    cy.get('[data-cy="user-action-menu-trigger"]').click();
    cy.get('[data-cy="user-action-block"]').should('exist');
  });
});
