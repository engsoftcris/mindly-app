describe('Fluxo de Deletar Post (TAL-38)', () => {
  const userA = { id: 1, username: 'tester', display_name: 'Tester User' };

  const postToDelete = {
    id: 500,
    content: 'Este pensamento será deletado em breve.',
    created_at: new Date().toISOString(),
    author: userA,
  };

  const mockFeed = {
    count: 1,
    results: [postToDelete],
  };

  beforeEach(() => {
    cy.intercept('GET', '**/api/accounts/profile/**', { statusCode: 200, body: userA }).as('getMyProfile');
    cy.intercept('GET', '**/api/accounts/feed/**', { statusCode: 200, body: mockFeed }).as('getFeed');
    cy.intercept('GET', '**/api/notifications/**', { statusCode: 200, body: [] }).as('getNotifications');

    // CORREÇÃO: DELETE com a rota que o frontend está chamando
    cy.intercept('DELETE', `**/api/accounts/posts/${postToDelete.id}/`, { 
      statusCode: 204 
    }).as('deleteRequest');

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token');
        win.localStorage.setItem('refresh', 'fake-refresh');
      },
    });

    cy.wait(['@getMyProfile', '@getFeed'], { timeout: 10000 });
  });

  it('Deve realizar o ciclo completo de deleção com sucesso', () => {
    cy.contains(postToDelete.content).should('be.visible');

    cy.get('[data-cy="user-action-menu-trigger"]').first().click({ force: true });
    cy.get('[data-cy="user-action-delete"]').should('exist').click({ force: true });

    cy.get('[data-cy="user-action-confirm-delete"]').should('exist').and('contain', 'CONFIRM');
    cy.get('[data-cy="user-action-cancel-delete"]').should('exist').and('contain', 'Cancel');

    cy.get('[data-cy="user-action-confirm-delete"]').click({ force: true });

    // AGORA deve funcionar porque a rota está correta
    cy.wait('@deleteRequest', { timeout: 10000 });

    cy.contains(postToDelete.content).should('not.exist');
  });

  it('Deve permitir cancelar a deleção e manter o post na tela', () => {
    cy.contains(postToDelete.content).should('be.visible');

    cy.get('[data-cy="user-action-menu-trigger"]').first().click({ force: true });
    cy.get('[data-cy="user-action-delete"]').should('exist').click({ force: true });

    cy.get('[data-cy="user-action-cancel-delete"]').should('exist').click({ force: true });

    cy.contains(postToDelete.content).should('be.visible');
    cy.get('[data-cy="user-action-confirm-delete"]').should('not.exist');
  });
});