it('Deve exibir erro com credenciais inválidas', () => {
  cy.visit('/login');
  cy.contains('label', 'Utilizador').parent().find('input').type('usuario_que_nao_existe');
  cy.contains('label', 'Palavra-passe').parent().find('input').type('senha_errada');
  cy.get('button[type="submit"]').click();

  // Verifica se a mensagem de erro definida no teu Login.jsx aparece
  cy.contains('Falha no login. Verifica as tuas credenciais.').should('be.visible');
  // Garante que ainda estamos na página de login
  cy.url().should('include', '/login');
});