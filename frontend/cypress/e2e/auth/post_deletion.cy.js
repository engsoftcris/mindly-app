describe('Fluxo de Deletar Post (TAL-38)', () => {
  const userA = { id: 1, username: 'tester', display_name: 'Tester User' };
  const postToDelete = {
    id: 500,
    content: 'Este pensamento será deletado em breve.',
    created_at: new Date().toISOString(),
    author: userA
  };

  const mockFeed = {
    count: 1,
    results: [postToDelete]
  };

  beforeEach(() => {
    // Setup de Autenticação e Mocks
    cy.intercept('GET', '**/accounts/profile/**', { statusCode: 200, body: userA }).as('getMyProfile');
    cy.intercept('GET', '**/posts/**', { statusCode: 200, body: mockFeed }).as('getFeed');
    
    // Intercepta o DELETE que criamos no Django
    cy.intercept('DELETE', `**/accounts/posts/${postToDelete.id}/`, {
      statusCode: 204
    }).as('deleteRequest');

    // Visita a página com localStorage setado
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token');
      },
    });
    cy.wait(['@getMyProfile', '@getFeed']);
  });

  it('Deve realizar o ciclo completo de deleção com sucesso', () => {
    // 1. Verifica se o post está na tela
    cy.contains(postToDelete.content).should('be.visible');

    // 2. Abre o menu de ações do post
    cy.get('button').find('svg').first().click({ force: true });

    // 3. Clica em "Deletar Post" (Primeiro clique)
    cy.contains('button', 'Deletar Post').click();

    // 4. Valida estado de confirmação (Double Tap)
    cy.contains('CONFIRMAR DELETAR?').should('be.visible');
    cy.contains('Cancelar').should('be.visible');

    // 5. Clica em Confirmar (Segundo clique)
    cy.contains('button', 'CONFIRMAR DELETAR?').click();

    // 6. Valida requisição e feedback
    cy.wait('@deleteRequest');
    cy.contains('Post eliminado.').should('be.visible');

    // 7. Valida Reatividade: O post deve sumir do DOM sem Refresh
    cy.contains(postToDelete.content).should('not.exist');
    cy.contains('No posts to show right now.').should('be.visible');
  });

  it('Deve permitir cancelar a deleção e manter o post na tela', () => {
    cy.get('button').find('svg').first().click({ force: true });
    cy.contains('button', 'Deletar Post').click();
    
    // Clica em Cancelar
    cy.contains('button', 'Cancelar').click();

    // O post deve continuar visível e a opção de deletar deve resetar
    cy.contains(postToDelete.content).should('be.visible');
    cy.contains('CONFIRMAR DELETAR?').should('not.exist');
  });
});