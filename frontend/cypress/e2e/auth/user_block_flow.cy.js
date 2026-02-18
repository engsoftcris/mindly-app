Cypress.on('uncaught:exception', () => false);

describe('Fluxo de Bloqueio de Utilizador no Dashboard', () => {
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

  beforeEach(() => {
    // 1. Usa o comando customizado para injetar o estado de login
    cy.login({ path: '/' });

    // 2. Intercepts específicos para este cenário de teste
    // Note: O perfil do User A já é tratado dentro do cy.login, mas podemos sobrescrever se necessário
    cy.intercept('GET', '**/posts/**', { statusCode: 200, body: mockFeedWithUserB }).as('getFeed');
    cy.intercept('POST', `**/accounts/profiles/${userB.id}/block/**`, {
      statusCode: 200,
      body: { message: `@${userB.username} bloqueado.` },
    }).as('postBlock');
    cy.intercept('GET', '**/accounts/feed/**', { statusCode: 200, body: mockEmptyFeed }).as('getFollowing');
  });

  it('1. Deve carregar o feed inicial e realizar o bloqueio com redirecionamento', () => {
    cy.wait('@getFeed');
    
    // Abre o menu e bloqueia
    cy.get('button[type="button"]').first().click({ force: true });
    cy.contains('button', `Bloquear @${userB.username}`).click();
    
    cy.wait('@postBlock');

    // Validação do BUG-41 (Redirect para Home ou Feed)
    cy.url().should('satisfy', (url) => url.endsWith('/') || url.includes('/feed'));
    cy.contains(`@${userB.username} bloqueado.`).should('be.visible');
  });

  it('2. Deve redirecionar ao bloquear diretamente na página de perfil', () => {
    cy.intercept('GET', `**/accounts/profiles/${userB.id}/`, { statusCode: 200, body: userB }).as('getSpecificProfile');
    
    // Navega para o perfil usando a sessão já ativa
    cy.visit(`/profile/${userB.id}`);
    cy.wait('@getSpecificProfile');

    cy.get('button[type="button"]').first().click({ force: true });
    cy.contains('button', `Bloquear @${userB.username}`).click();
    
    cy.wait('@postBlock');

    // Verifica se foi "expulso" da página de perfil
    cy.url().should('not.include', `/profile/${userB.id}`);
    cy.url().should('satisfy', (url) => url.endsWith('/') || url.includes('/feed'));
  });
});