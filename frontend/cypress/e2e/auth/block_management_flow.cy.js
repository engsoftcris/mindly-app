describe('Mindly - Gestão Completa de Bloqueios (TAL-14)', () => {
  const TARGET_UUID = '47c2903b-3ee2-4d35-9bb7-51949fb0274d';
  const TARGET_USER = 'target_user';
  const ANOTHER_UUID = '87c2903b-3ee2-4d35-9bb7-51949fb0274e';
  const ANOTHER_USER = 'another_user';

  beforeEach(() => {
    cy.viewport(1280, 800);
    Cypress.on('uncaught:exception', () => false);

    cy.intercept('GET', '**/api/notifications/**', {
      statusCode: 200,
      body: { results: [] },
    }).as('getNotifications');

    cy.intercept('GET', '**/api/accounts/suggested-follows/**', {
      statusCode: 200,
      body: { results: [] },
    }).as('getSuggested');
  });

  // garante que o PublicProfile saiu do LoadingScreen e renderizou
  const waitProfileRendered = (username) => {
    cy.contains(`@${username}`, { timeout: 20000 }).should('be.visible');
  };

  const openActionMenu = () => {
    // garante que o menu existe (ele só renderiza se currentUser existir)
    cy.get('[data-cy="user-action-menu"]', { timeout: 20000 }).should('be.visible');

    cy.get('[data-cy="user-action-menu-trigger"]', { timeout: 20000 })
      .should('be.visible')
      .click({ force: true })
      .should('have.attr', 'aria-expanded', 'true');

    // NÃO é portal: o panel está na mesma árvore
    cy.get('[data-cy="user-action-menu-panel"]', { timeout: 10000 })
      .should('exist')
      .and('be.visible');
  };

  const clickBlock = () => {
    // o botão existe apenas se canBlock = true
    cy.get('[data-cy="user-action-block"]', { timeout: 10000 })
      .should('be.visible')
      .click({ force: true });
  };

 it('Deve impedir interação com usuário bloqueado (posts não aparecem)', () => {
  cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/`, {
    statusCode: 200,
    body: {
      id: TARGET_UUID,
      username: TARGET_USER,
      display_name: 'Alvo',
      profile_picture: '',
      bio: '',
      is_blocked: true,
      is_restricted: true,
      posts: [],
    },
  }).as('getBlockedProfile');

  cy.login({ path: `/profile/${TARGET_UUID}`, seedFeed: false });

  cy.wait('@getBlockedProfile');

  // ✅ sincroniza com o DOM: garante que saiu do LoadingScreen e renderizou o perfil
  cy.contains(`@${TARGET_USER}`, { timeout: 20000 }).should('be.visible');

  cy.contains('h2', 'These posts are protected', { timeout: 20000 }).should('be.visible');
  cy.get('[data-cy="post-card"]').should('not.exist');
});

  it('Deve realizar o fluxo de bloqueio corretamente', () => {
  cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/`, {
    statusCode: 200,
    body: {
      id: TARGET_UUID,
      username: TARGET_USER,
      display_name: 'Alvo',
      profile_picture: '',
      bio: '',
      is_blocked: false,
      is_restricted: false,
      posts: [],
    },
  }).as('getTargetProfile');

  cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block/`, {
    statusCode: 201,
    body: { is_blocked: true },
  }).as('blockAction');

  cy.login({ path: `/profile/${TARGET_UUID}`, seedFeed: false });
  cy.wait('@getTargetProfile');

  // ✅ garante que o perfil carregou e o menu existe
  cy.contains(`@${TARGET_USER}`, { timeout: 20000 }).should('be.visible');
  cy.get('[data-cy="user-action-menu"]', { timeout: 20000 }).should('be.visible');

  // ✅ abre menu e valida estado aberto
  cy.get('[data-cy="user-action-menu-trigger"]', { timeout: 20000 })
    .should('be.visible')
    .click({ force: true })
    .should('have.attr', 'aria-expanded', 'true');

  // ✅ panel NÃO é portal
  cy.get('[data-cy="user-action-menu-panel"]', { timeout: 10000 })
    .should('be.visible');

  cy.get('[data-cy="user-action-block"]', { timeout: 10000 })
    .should('be.visible')
    .click({ force: true });

  cy.wait('@blockAction');

  // Seu componente navega pra /feed após bloquear a partir de /profile
  cy.location('pathname', { timeout: 20000 }).should('include', '/feed');

  // intercept de settings ANTES de ir pra settings
  cy.intercept('GET', '**/api/accounts/profiles/blocked-users/', {
    statusCode: 200,
    body: [{ id: TARGET_UUID, username: TARGET_USER, display_name: 'Alvo' }],
  }).as('listBlocked');

  cy.login({ path: '/settings', seedFeed: false });
  cy.get('[data-cy="settings-view-blocked"]', { timeout: 20000 }).click();
  cy.wait('@listBlocked');

  cy.contains(`@${TARGET_USER}`, { timeout: 20000 }).should('be.visible');
});

  it('Deve bloquear múltiplos usuários e gerenciar a lista corretamente', () => {
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/`, {
      statusCode: 200,
      body: { id: TARGET_UUID, username: TARGET_USER, display_name: 'Alvo', is_blocked: false, posts: [] },
    }).as('getTargetProfile');

    cy.intercept('GET', `**/api/accounts/profiles/${ANOTHER_UUID}/`, {
      statusCode: 200,
      body: { id: ANOTHER_UUID, username: ANOTHER_USER, display_name: 'Outro', is_blocked: false, posts: [] },
    }).as('getAnotherProfile');

    cy.intercept('POST', `**/api/accounts/profiles/*/block/`, {
      statusCode: 201,
      body: { is_blocked: true },
    }).as('blockGeneric');

    cy.login({ path: `/profile/${TARGET_UUID}`, seedFeed: false });
    cy.wait('@getTargetProfile');
    waitProfileRendered(TARGET_USER);
    openActionMenu();
    clickBlock();
    cy.wait('@blockGeneric');

    cy.login({ path: `/profile/${ANOTHER_UUID}`, seedFeed: false });
    cy.wait('@getAnotherProfile');
    waitProfileRendered(ANOTHER_USER);
    openActionMenu();
    clickBlock();
    cy.wait('@blockGeneric');

    cy.intercept('GET', '**/api/accounts/profiles/blocked-users/', {
      statusCode: 200,
      body: [
        { id: TARGET_UUID, username: TARGET_USER },
        { id: ANOTHER_UUID, username: ANOTHER_USER },
      ],
    }).as('listFull');

    cy.login({ path: '/settings', seedFeed: false });
    cy.get('[data-cy="settings-view-blocked"]').click();
    cy.wait('@listFull');

    cy.contains(`@${TARGET_USER}`).should('be.visible');
    cy.contains(`@${ANOTHER_USER}`).should('be.visible');
  });

  it('Deve manter histórico de bloqueio mesmo após desbloquear (não recria follow)', () => {
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/`, {
      statusCode: 200,
      body: {
        id: TARGET_UUID,
        username: TARGET_USER,
        display_name: 'Alvo',
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
    }).as('listOnce');

    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block/`, {
      statusCode: 200,
      body: { is_blocked: false },
    }).as('unblock');

    cy.login({ path: '/settings', seedFeed: false });
    cy.get('[data-cy="settings-view-blocked"]').click();
    cy.wait('@listOnce');

    cy.get(`[data-cy="unblock-btn-${TARGET_USER}"]`).click();
    cy.wait('@unblock');

    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/`, {
      statusCode: 200,
      body: {
        id: TARGET_UUID,
        username: TARGET_USER,
        display_name: 'Alvo',
        is_blocked: false,
        is_following: false,
        posts: [],
      },
    }).as('getFinalProfile');

    cy.login({ path: `/profile/${TARGET_UUID}`, seedFeed: false });
    cy.wait('@getFinalProfile');
    waitProfileRendered(TARGET_USER);

    cy.get('[data-cy="follow-button"]').should('contain', 'Seguir');
  });
});