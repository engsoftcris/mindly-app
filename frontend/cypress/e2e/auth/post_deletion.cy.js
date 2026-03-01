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
    // ✅ mocks do bootstrap da home
    cy.intercept('GET', '**/accounts/profile/**', { statusCode: 200, body: userA }).as('getMyProfile');
    cy.intercept('GET', '**/posts/**', { statusCode: 200, body: mockFeed }).as('getFeed');

    // Se sua home chama notifications, intercepte para evitar ruído
    cy.intercept('GET', '**/notifications/**', { statusCode: 200, body: [] }).as('getNotifications');

    // ✅ intercept do DELETE (o frontend chama /accounts/posts/:id/)
    cy.intercept('DELETE', `**/accounts/posts/${postToDelete.id}/`, { statusCode: 204 }).as('deleteRequest');

    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token');
      },
    });

    cy.wait(['@getMyProfile', '@getFeed']);
  });

  it('Deve realizar o ciclo completo de deleção com sucesso', () => {
    // 1) post visível
    cy.contains(postToDelete.content).should('be.visible');

    // 2) abre menu do post (usa data-cy do seu UserActionMenu)
    cy.get('[data-cy="user-action-menu-trigger"]').first().click({ force: true });

    // 3) primeiro clique: Delete post
    cy.get('[data-cy="user-action-delete"]').should('exist').click({ force: true });

    // 4) confirma estado
    cy.get('[data-cy="user-action-confirm-delete"]').should('exist').and('contain', 'CONFIRM');
    cy.get('[data-cy="user-action-cancel-delete"]').should('exist').and('contain', 'Cancel');

    // 5) segundo clique: confirma
    cy.get('[data-cy="user-action-confirm-delete"]').click({ force: true });

    // 6) valida request
    cy.wait('@deleteRequest');

    // 7) UI reativa: post sai do DOM
    cy.contains(postToDelete.content).should('not.exist');
  });

  it('Deve permitir cancelar a deleção e manter o post na tela', () => {
    cy.contains(postToDelete.content).should('be.visible');

    cy.get('[data-cy="user-action-menu-trigger"]').first().click({ force: true });

    cy.get('[data-cy="user-action-delete"]').should('exist').click({ force: true });

    // cancela
    cy.get('[data-cy="user-action-cancel-delete"]').should('exist').click({ force: true });

    // post continua
    cy.contains(postToDelete.content).should('be.visible');

    // confirmação desaparece
    cy.get('[data-cy="user-action-confirm-delete"]').should('not.exist');
  });
});