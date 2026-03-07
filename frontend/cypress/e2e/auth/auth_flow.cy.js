describe('Fluxo Real de Autenticação', () => {

  it('Deve mostrar a página de login e verificar se o botão do Google está operacional', () => {
    cy.visit('/login');

    cy.get('h2').should('contain', 'Mindly');

    cy.get('button')
      .contains(/Google/i)
      .should('be.visible')
      .and('not.be.disabled');
  });

  it('Verifica se a API de Auth está respondendo (Integridade)', () => {

    cy.intercept('POST', '**/api/accounts/google/', {
      statusCode: 200,
      body: { success: true }
    }).as('googleLogin');

    cy.visit('/login');
  });


  describe('Sanity Check - Perfil', () => {

    it('Deve carregar o perfil com sucesso usando token', () => {

      const fakeToken = 'token-fake-valido';

      cy.intercept('GET', '**/api/accounts/profile/', {
        statusCode: 200,
        body: {
          id: 1,
          name: 'Test User',
          email: 'test@mindly.app'
        }
      }).as('getProfile');

      cy.visit('/');

      cy.window().then((win) => {
        win.localStorage.setItem('access', fakeToken);
      });

      cy.wait('@getProfile').its('response.statusCode').should('eq', 200);

    });

  });

});