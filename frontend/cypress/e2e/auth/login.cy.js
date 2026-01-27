describe('Fluxo de Login', () => {
  it('Deve fazer login com sucesso e redirecionar para a Home', () => {
    const username = 'testuser_login';
    const password = 'senha123';

    // Garante que o usuário existe
    cy.request({
      method: 'POST',
      url: 'http://localhost:8000/api/register/',
      body: {
        username: username,
        full_name: 'Login Test',
        email: `${username}@example.com`,
        password: password
      },
      failOnStatusCode: false 
    });

    cy.visit('/login');

    // Selecionando pela label "Utilizador" e pegando o input seguinte
    cy.contains('label', 'Utilizador').parent().find('input').type(username);
    
    // Selecionando pela label "Palavra-passe" e pegando o input seguinte
    cy.contains('label', 'Palavra-passe').parent().find('input').type(password);

    cy.get('button[type="submit"]').click();

    // Verifica se redirecionou para a Home (URL vazia ou /)
    cy.url().should('eq', Cypress.config().baseUrl + '/');

    // Verifica se o token foi salvo
    cy.window().then((win) => {
      // Verifica o nome da chave que o teu AuthContext usa (pode ser 'token' ou 'access')
      const token = win.localStorage.getItem('access') || win.localStorage.getItem('token');
      expect(token).to.exist;
    });
  });
});