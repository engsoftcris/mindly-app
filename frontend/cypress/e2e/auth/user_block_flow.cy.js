describe('Fluxo de Bloqueio de Utilizador no Dashboard', () => {
  const MY_UUID = '00000000-0000-0000-0000-000000000001';
  const TARGET_UUID = '99999999-9999-9999-9999-999999999999';

  beforeEach(() => {
    Cypress.on('uncaught:exception', () => false);
    cy.viewport(1280, 800);

    cy.intercept('GET', '**/api/notifications/**', {
      statusCode: 200,
      body: [], // Array vazio, não objeto com results
    }).as('getNotifications');

    cy.intercept('GET', '**/api/accounts/profile/**', {
      statusCode: 200,
      body: {
        id: MY_UUID,
        username: 'cristiano.tobias',
        display_name: 'Cristiano',
        profile_picture: null,
        followers_count: 0,
        following_count: 0,
        posts: []
      },
    }).as('getProfile');

    cy.intercept('GET', '**/api/accounts/suggested-follows/**', {
      statusCode: 200,
      body: []
    }).as('getSuggestions');

    cy.login({ path: '/' });
  });

  it('1. Deve realizar o bloqueio no feed', () => {
    cy.intercept('GET', '**/api/accounts/feed/**', {
      statusCode: 200,
      body: {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 101,
            content: 'Post de teste',
            author: { 
              id: TARGET_UUID, 
              username: 'outro_usuario',
              display_name: 'Outro Usuário',
              profile_picture: null,
              is_blocked: false
            },
            created_at: new Date().toISOString(),
            likes_count: 0,
            comments_count: 0,
            is_liked: false,
            moderation_status: 'APPROVED'
          },
        ],
      },
    }).as('getFeed');

    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block**`, {
      statusCode: 200,
      body: { success: true, is_blocked: true },
    }).as('postBlock');

    cy.visit('/');

    cy.wait(['@getProfile', '@getNotifications', '@getFeed', '@getSuggestions'], { timeout: 10000 });

    cy.get('[data-cy="user-action-menu-trigger"]', { timeout: 10000 })
      .first()
      .should('be.visible')
      .click();

    cy.get('[data-cy="user-action-block"]', { timeout: 10000 })
      .should('be.visible')
      .click();

    cy.wait('@postBlock');

    cy.contains('Post de teste').should('not.exist');
  });

  it('2. Deve redirecionar ao bloquear na página de perfil', () => {
    // CORREÇÃO: Mock completo do perfil público
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/**`, {
      statusCode: 200,
      body: { 
        id: TARGET_UUID, 
        username: 'outro_usuario', 
        display_name: 'Outro Usuário',
        profile_picture: null,
        is_blocked: false,
        is_restricted: false,
        is_following: false,
        followers_count: 0,
        following_count: 0,
        posts: []
      },
    }).as('getPublicProfile');

    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block**`, {
      statusCode: 200,
      body: { success: true, is_blocked: true },
    }).as('postBlockProfile');

    cy.visit(`/profile/${TARGET_UUID}`);
    cy.wait(['@getProfile', '@getNotifications', '@getPublicProfile', '@getSuggestions'], { timeout: 10000 });

    // DEBUG: Ver o HTML após carregar
    cy.document().then(doc => {
      console.log('HTML do perfil após carregar:');
      console.log(doc.body.innerHTML);
    });

    cy.get('[data-cy="user-action-menu-trigger"]', { timeout: 10000 })
      .should('be.visible')
      .click();

    cy.get('[data-cy="user-action-block"]', { timeout: 10000 })
      .should('be.visible')
      .click();

    cy.wait('@postBlockProfile');

    cy.location('pathname', { timeout: 20000 }).should('match', /^\/(feed)?$/);
  });

  it('3. Deve realizar o desbloqueio na página de perfil', () => {
  // 1) ESTADO INICIAL: Usuário Bloqueado
  cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/**`, {
    statusCode: 200,
    body: {
      id: TARGET_UUID,
      username: 'usuario_bloqueado',
      display_name: 'Usuário Bloqueado',
      profile_picture: null,
      is_blocked: true,
      is_restricted: true,
      is_following: false,
      followers_count: 0,
      following_count: 0,
      posts: [],
    },
  }).as('getBlockedProfile');

  // 2) MOCK DO POST (Toggle block/unblock)
  cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block**`, {
    statusCode: 200,
    body: { success: true, is_blocked: false },
  }).as('postToggleBlock');

  cy.visit(`/profile/${TARGET_UUID}`);
  cy.wait(['@getProfile', '@getNotifications', '@getBlockedProfile', '@getSuggestions'], { timeout: 10000 });

  cy.get('[data-cy="user-action-menu-trigger"]', { timeout: 10000 })
    .should('be.visible')
    .click();

  cy.get('[data-cy="user-action-unblock"]', { timeout: 10000 })
    .should('be.visible')
    .and('contain', 'Unblock')
    .click();

  cy.wait('@postToggleBlock');

  // 3) Atualiza o GET para retornar is_blocked:false
  cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/**`, {
    statusCode: 200,
    body: {
      id: TARGET_UUID,
      username: 'usuario_bloqueado',
      display_name: 'Usuário Bloqueado',
      profile_picture: null,
      is_blocked: false,
      is_restricted: false,
      is_following: false,
      followers_count: 0,
      following_count: 0,
      posts: [],
    },
  }).as('getUnblockedProfile');

  cy.reload();
  cy.wait(['@getProfile', '@getNotifications', '@getUnblockedProfile', '@getSuggestions'], { timeout: 10000 });

  // CORREÇÃO: Aguardar um pouco mais para o menu atualizar
  cy.wait(1000);

  cy.get('[data-cy="user-action-menu-trigger"]', { timeout: 10000 })
    .should('be.visible')
    .click();

  // Verificar se o menu tem a opção Block (pode ser que ainda exista Unblock mas Block também apareça)
  cy.get('[data-cy="user-action-block"]', { timeout: 10000 })
    .should('exist')
    .and('contain', 'Block');
  
  // Opcional: verificar que Unblock não existe mais
  cy.get('[data-cy="user-action-unblock"]').should('not.exist');

  cy.log('Sucesso: Fluxo de desbloqueio completo!');
});
});