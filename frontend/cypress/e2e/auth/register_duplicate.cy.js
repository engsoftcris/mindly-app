it('Deve exibir erro ao registrar username já existente', () => {
  const duplicateUser = 'user_existente';
  
  // Criar o primeiro user
  cy.request({
    method: 'POST',
    url: 'http://localhost:8000/api/register/',
    body: { username: duplicateUser, full_name: 'Original', email: 'a@a.com', password: '123' },
    failOnStatusCode: false
  });

  cy.visit('/register');
  cy.get('input[placeholder="Username"]').type(duplicateUser);
  cy.get('input[placeholder="Nome Completo"]').type('Outro Nome');
  cy.get('input[placeholder="Email"]').type('outro@email.com');
  cy.get('input[placeholder="Password"]').type('123');
  cy.get('button[type="submit"]').click();

  // Verifica a mensagem de erro do teu Register.jsx
  cy.contains('Erro ao registar. Verifica os dados ou se o user já existe.').should('be.visible');
});