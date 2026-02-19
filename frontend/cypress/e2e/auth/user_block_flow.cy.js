describe('Fluxo de Bloqueio de Utilizador no Dashboard', () => {
  const userB = { 
    id: 999, 
    username: 'perfil_bloqueado', 
    display_name: 'Perfil Destino' 
  };

  beforeEach(() => {
    Cypress.on('uncaught:exception', () => false);
    cy.viewport(1280, 800);

    cy.intercept('GET', '**/api/accounts/profile/**', {
      statusCode: 200,
      body: { id: 1, username: 'testuser' }
    }).as('getProfile');

    cy.intercept('GET', '**/api/posts/**', {
      statusCode: 200,
      body: { 
        count: 1, 
        results: [{ 
          id: 101, 
          content: 'Post alvo do bloqueio', 
          author: userB,
          created_at: new Date().toISOString()
        }] 
      }
    }).as('getFeed');

    cy.intercept('POST', '**/api/accounts/profiles/*/block/', {
      statusCode: 200,
      body: { success: true }
    }).as('postBlock');

    cy.login({ path: '/' }); 
  });

  it('1. Deve realizar o bloqueio no feed e remover o post', () => {
    cy.wait(['@getProfile', '@getFeed']);

    cy.get('[data-cy="user-action-menu-trigger"]').first().click({ force: true });

    cy.get('[data-cy="user-action-block"]')
      .should('be.visible')
      .click({ force: true });

    cy.contains('Post alvo do bloqueio', { timeout: 15000 }).should('not.exist');

    cy.location('pathname').should('eq', '/');
  });

  it('2. Deve redirecionar ao bloquear na página de perfil', () => {
    cy.intercept('GET', '**/api/accounts/profiles/999/', { 
      statusCode: 200, 
      body: { ...userB, posts: [] } 
    }).as('getPublicProfile');

    cy.visit('/profile/999');
    cy.wait(['@getProfile', '@getPublicProfile']);

    cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true });
    cy.get('[data-cy="user-action-block"]').click({ force: true });

    cy.wait('@postBlock');

    cy.location('pathname').should('eq', '/');
  });
});
