describe('Mindly - Gestão Completa de Bloqueios (TAL-14)', () => {
  const TARGET_UUID = '47c2903b-3ee2-4d35-9bb7-51949fb0274d';
  const TARGET_USER = 'target_user';

  beforeEach(() => {
    cy.viewport(1280, 800);
    Cypress.on('uncaught:exception', () => false);

    // ===== AUTH MOCK (ESSENCIAL) =====
    cy.window().then((win) => {
      win.localStorage.setItem('accessToken', 'fake-access');
      win.localStorage.setItem('refreshToken', 'fake-refresh');
    });

    cy.intercept('POST', '**/api/token/refresh/', {
      statusCode: 200,
      body: { access: 'new-access-token' },
    }).as('refreshToken');

    // ===== ENDPOINTS BASE =====
    cy.intercept('GET', '**/api/accounts/profile/', {
      statusCode: 200,
      body: { id: 'me-123', username: 'tester' },
    }).as('getMyProfile');

    cy.intercept('GET', '**/api/notifications/**', {
      statusCode: 200,
      body: { results: [] },
    }).as('getNotifications');

    cy.intercept('GET', '**/api/accounts/suggested-follows/**', {
      statusCode: 200,
      body: { results: [] },
    }).as('getSuggested');

    cy.intercept('GET', '**/api/accounts/profiles/relationships-sync/**', {
      statusCode: 200,
      body: [],
    }).as('relationshipsSync');
  });

  const waitProfileRendered = (username) => {
    cy.contains(`@${username}`, { timeout: 20000 }).should('be.visible');
  };

  const openActionMenu = () => {
    cy.get('[data-cy="user-action-menu"]', { timeout: 20000 }).should(
      'be.visible'
    );

    cy.get('[data-cy="user-action-menu-trigger"]')
      .should('be.visible')
      .click({ force: true });

    cy.get('[data-cy="user-action-menu-panel"]').should('be.visible');
  };

  const clickBlock = () => {
    cy.get('[data-cy="user-action-block"]')
      .should('be.visible')
      .click({ force: true });
  };

  it('Deve impedir interação com usuário bloqueado (posts não aparecem)', () => {
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/`, {
      statusCode: 200,
      body: {
        id: TARGET_UUID,
        username: TARGET_USER,
        is_blocked: true,
        is_restricted: true,
        posts: [],
      },
    }).as('getBlockedProfile');

    cy.login({ path: `/profile/${TARGET_UUID}`, seedFeed: false });

    cy.wait('@getBlockedProfile');

    waitProfileRendered(TARGET_USER);

    cy.contains('These posts are protected').should('be.visible');
    cy.get('[data-cy="post-card"]').should('not.exist');
  });

  it('Deve realizar o fluxo de bloqueio corretamente', () => {
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/`, {
      statusCode: 200,
      body: {
        id: TARGET_UUID,
        username: TARGET_USER,
        is_blocked: false,
        posts: [],
      },
    }).as('getTargetProfile');

    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block/`, {
      statusCode: 201,
      body: { is_blocked: true },
    }).as('blockAction');

    cy.intercept('GET', '**/api/accounts/profiles/blocked-users/', {
      statusCode: 200,
      body: [{ id: TARGET_UUID, username: TARGET_USER }],
    }).as('listBlocked');

    cy.login({ path: `/profile/${TARGET_UUID}`, seedFeed: false });

    // espere apenas o determinístico
    cy.wait('@getTargetProfile');

    waitProfileRendered(TARGET_USER);

    openActionMenu();
    clickBlock();

    cy.wait('@blockAction');

    cy.visit('/settings');

    cy.url().should('include', '/settings');

    cy.get('[data-cy="settings-view-blocked"]').should('be.visible').click();

    cy.wait('@listBlocked');

    cy.contains(`@${TARGET_USER}`).should('be.visible');
  });

  it('Deve manter histórico de bloqueio mesmo após desbloquear', () => {
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/`, {
      statusCode: 200,
      body: {
        id: TARGET_UUID,
        username: TARGET_USER,
        is_blocked: false,
        is_following: true,
        posts: [],
      },
    }).as('getInitProfile');

    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block/`, {
      statusCode: 200,
      body: { is_blocked: true },
    }).as('block');

    cy.login({ path: `/profile/${TARGET_UUID}`, seedFeed: false });

    cy.wait('@getInitProfile');
    waitProfileRendered(TARGET_USER);

    openActionMenu();
    clickBlock();
    cy.wait('@block');

    cy.intercept('GET', '**/api/accounts/profiles/blocked-users/', {
      statusCode: 200,
      body: [{ id: TARGET_UUID, username: TARGET_USER }],
    }).as('listBlocked');

    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block/`, {
      statusCode: 200,
      body: { is_blocked: false },
    }).as('unblock');

    cy.visit('/settings');

    cy.get('[data-cy="settings-view-blocked"]').click();
    cy.wait('@listBlocked');

    cy.get(`[data-cy="unblock-btn-${TARGET_USER}"]`).click();
    cy.wait('@unblock');

    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/`, {
      statusCode: 200,
      body: {
        id: TARGET_UUID,
        username: TARGET_USER,
        is_blocked: false,
        is_following: false,
        posts: [],
      },
    }).as('getFinalProfile');

    cy.visit(`/profile/${TARGET_UUID}`);

    cy.wait('@getFinalProfile');
    waitProfileRendered(TARGET_USER);

    cy.get('[data-cy="follow-button"]').should('contain', 'Seguir');
  });
});
