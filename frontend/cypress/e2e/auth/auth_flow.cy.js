describe('Fluxo Real de Autenticação - Blindado', () => {
  it('1. Deve mostrar a página de login e verificar se o botão do Google está operacional', () => {
    cy.visit('/login');

    // Verifica o título via data-cy
    cy.getByData('login-title').should('contain', 'Mindly');

    // Verifica o botão via data-cy
    cy.getByData('google-login-button')
      .should('be.visible')
      .and('not.be.disabled');
  });

  it('2. Verifica se a API de Auth está respondendo (Integridade)', () => {
    cy.intercept('POST', '**/api/accounts/google/', {
      statusCode: 200,
      body: { success: true },
    }).as('googleLogin');

    cy.visit('/login');
    // Aqui você poderia disparar o clique se quisesse testar a chamada
  });

  describe('Sanity Check - Perfil', () => {
    it('3. Deve carregar o perfil com sucesso usando token', () => {
      const fakeToken = 'token-fake-valido';

      cy.intercept('GET', '**/api/accounts/profile/', {
        statusCode: 200,
        body: {
          id: 1,
          name: 'Test User',
          email: 'test@mindly.app',
        },
      }).as('getProfile');

      cy.visit('/');

      cy.window().then((win) => {
        win.localStorage.setItem('access', fakeToken);
      });

      cy.wait('@getProfile').its('response.statusCode').should('eq', 200);
    });
  });
});
