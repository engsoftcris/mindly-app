describe('Fluxo de Bloqueio de Utilizador no Dashboard', () => {
  const MY_UUID = '00000000-0000-0000-0000-000000000001';
  const TARGET_UUID = '99999999-9999-9999-9999-999999999999';

  beforeEach(() => {
    Cypress.on('uncaught:exception', () => false);
    cy.viewport(1280, 800);

    // Mock global: Notifications (evita chamadas reais no CI)
    cy.intercept('GET', '**/api/notifications/**', {
      statusCode: 200,
      body: { results: [] },
    }).as('getNotifications');

    // Mock do Perfil do Usuário Logado (Navbar/AuthContext)
    cy.intercept('GET', '**/api/accounts/profile/**', {
      statusCode: 200,
      body: {
        id: MY_UUID,
        username: 'cristiano.tobias',
        display_name: 'Cristiano',
      },
    }).as('getProfile');

    // Login via custom command (garanta que seta localStorage/cookies)
    cy.login({ path: '/' });
  });

  it('1. Deve realizar o bloqueio no feed', () => {
    cy.intercept('GET', '**/api/posts/**', {
      statusCode: 200,
      body: {
        results: [
          {
            id: 101,
            content: 'Post de teste',
            author: { id: TARGET_UUID, username: 'outro_usuario' },
          },
        ],
      },
    }).as('getFeed');

    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block**`, {
      statusCode: 200,
      body: { success: true, is_blocked: true },
    }).as('postBlock');

    cy.visit('/');

    // espere também notifications (o app costuma chamar em paralelo)
    cy.wait(['@getProfile', '@getNotifications', '@getFeed']);

    cy.get('[data-cy="user-action-menu-trigger"]')
      .first()
      .should('be.visible')
      .click();

    cy.get('[data-cy="user-action-block"]')
      .should('be.visible')
      .click();

    cy.wait('@postBlock');

    cy.contains('Post de teste').should('not.exist');
  });

  it('2. Deve redirecionar ao bloquear na página de perfil', () => {
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}**`, {
      statusCode: 200,
      body: { id: TARGET_UUID, username: 'outro_usuario', is_blocked: false },
    }).as('getPublicProfile');

    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block**`, {
      statusCode: 200,
      body: { success: true, is_blocked: true },
    }).as('postBlockProfile');

    cy.visit(`/profile/${TARGET_UUID}`);
    cy.wait(['@getProfile', '@getNotifications', '@getPublicProfile']);

    cy.get('[data-cy="user-action-menu-trigger"]')
      .should('be.visible')
      .click();

    cy.get('[data-cy="user-action-block"]')
      .should('be.visible')
      .click();

    cy.wait('@postBlockProfile');

    // Aceita "/" ou "/feed" (ajuste se o seu app for 100% um deles)
    cy.location('pathname', { timeout: 20000 }).should('match', /^\/(feed)?$/);
  });

  it('3. Deve realizar o desbloqueio na página de perfil', () => {
    // 1) ESTADO INICIAL: Usuário Bloqueado
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}**`, {
      statusCode: 200,
      body: {
        id: TARGET_UUID,
        username: 'usuario_bloqueado',
        is_blocked: true, // renderiza "user-action-unblock"
        posts: [],
      },
    }).as('getBlockedProfile');

    // 2) MOCK DO POST (Toggle block/unblock)
    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block**`, {
      statusCode: 200,
      body: { success: true, is_blocked: false },
    }).as('postToggleBlock');

    cy.visit(`/profile/${TARGET_UUID}`);
    cy.wait(['@getProfile', '@getNotifications', '@getBlockedProfile']);

    // Abre menu e clica no Unblock
    cy.get('[data-cy="user-action-menu-trigger"]')
      .should('be.visible')
      .click();

    cy.get('[data-cy="user-action-unblock"]')
      .should('be.visible')
      .and('contain', 'Unblock')
      .click();

    cy.wait('@postToggleBlock');

    // 3) Atualiza o GET para retornar is_blocked:false
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}**`, {
      statusCode: 200,
      body: {
        id: TARGET_UUID,
        username: 'usuario_bloqueado',
        is_blocked: false,
        posts: [],
      },
    }).as('getUnblockedProfile');

    // 4) Recarrega para o React ler o novo estado
    cy.reload();
    cy.wait(['@getProfile', '@getNotifications', '@getUnblockedProfile']);

    // 5) Validação: botão virou "Block"
    cy.get('[data-cy="user-action-menu-trigger"]')
      .should('be.visible')
      .click();

    cy.get('[data-cy="user-action-block"]', { timeout: 10000 })
      .should('exist')
      .and('contain', 'Block')
      .and('not.contain', 'Unblock');

    cy.log('Sucesso: Fluxo de desbloqueio completo!');
  });
});