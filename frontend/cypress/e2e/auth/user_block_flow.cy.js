Cypress.on('uncaught:exception', () => false);

describe('Fluxo de Bloqueio de Utilizador no Dashboard', () => {
  const userA = { id: 'user-a-id', username: 'user_test_a', display_name: 'User A' };
  const userB = { id: 'uuid-user-b', username: 'perfil_bloqueado', display_name: 'Perfil Destino' };
  const postText = 'Este post vai sumir após o bloqueio';

  const mockFeedWithUserB = {
    count: 1,
    next: null,
    results: [{
      id: 101,
      content: postText,
      created_at: new Date().toISOString(),
      author: {
        id: userB.id,
        uuid: userB.id,
        username: userB.username,
        display_name: userB.display_name,
        profile_picture: null,
      },
    }],
  };

  const mockEmptyFeed = { count: 0, next: null, results: [] };

  const visitAuthed = (path = '/') => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token-123');
        win.localStorage.setItem('refresh', 'fake-refresh-123');
      },
    });
  };

  before(() => {
    // Intercepta e limpa tudo uma vez no início do bloco
    cy.clearLocalStorage();
    cy.clearCookies();
  });

  beforeEach(() => {
    // Setup de mocks comuns
    cy.intercept('GET', '**/accounts/profile/**', { statusCode: 200, body: userA }).as('getMyProfile');
    cy.intercept('GET', '**/posts/**', { statusCode: 200, body: mockFeedWithUserB }).as('getFeed');
    cy.intercept('POST', `**/accounts/profiles/${userB.id}/block/**`, {
      statusCode: 200,
      body: { message: `@${userB.username} bloqueado.` },
    }).as('postBlock');
    cy.intercept('GET', '**/accounts/feed/**', { statusCode: 200, body: mockEmptyFeed }).as('getFollowing');
  });

  it('1. Deve carregar o feed inicial com o post do alvo', () => {
    visitAuthed('/');
    cy.wait(['@getMyProfile', '@getFeed']);
    cy.contains(userB.display_name).should('be.visible');
    cy.contains(postText).should('be.visible');
  });

  it('2. Deve abrir o menu do post e realizar o bloqueio', () => {
    visitAuthed('/');
    cy.wait(['@getMyProfile', '@getFeed']);

    // Abre o menu de ações
    cy.contains('p', postText)
      .closest('div')
      .closest('div')
      .within(() => {
        cy.get('button[type="button"]').first().click({ force: true });
      });

    // Clica em Bloquear e valida chamada
    cy.contains('button', `Bloquear @${userB.username}`).should('be.visible').click();
    cy.wait('@postBlock');
    cy.contains(`@${userB.username} bloqueado.`).should('be.visible');
  });

  it('3. Deve remover o conteúdo da tela instantaneamente (Reatividade)', () => {
    visitAuthed('/');
    cy.wait(['@getMyProfile', '@getFeed']);

    // Realiza o bloqueio
    cy.get('button').find('svg').first().click({ force: true });
    cy.contains('button', `Bloquear @${userB.username}`).click();
    
    // Valida que sumiu do DOM
    cy.contains(userB.display_name).should('not.exist');
    cy.contains(postText).should('not.exist');
    cy.contains('No posts to show right now.').should('be.visible');
  });

 it('4. Deve persistir o bloqueio ao alternar entre abas', () => {
    // Definimos que, para este teste, o feed já virá vazio ou será o que monitoramos
    // Mudamos o alias aqui para não dar conflito com o beforeEach
    cy.intercept('GET', '**/posts/**', { statusCode: 200, body: mockEmptyFeed }).as('getPostsEmpty');
    
    visitAuthed('/');
    // Esperamos pelo perfil e pelo novo alias que definimos acima
    cy.wait(['@getMyProfile', '@getPostsEmpty']);

    // 1. Navega para "Seguindo"
    cy.contains('button', 'Seguindo').click({ force: true });
    cy.wait('@getFollowing');

    // 2. Volta para "Para você"
    cy.contains('button', 'Para você').click({ force: true });
    // Espera a requisição da aba "Para você" acontecer novamente
    cy.wait('@getPostsEmpty');

    // 3. Valida que o usuário bloqueado não existe
    cy.contains(userB.display_name).should('not.exist');
    cy.contains(postText).should('not.exist');
  });
});