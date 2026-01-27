describe('Fluxo de Registro', () => {
  it('Deve registrar um novo usuário com sucesso', () => {
    // Geramos um ID único para não dar erro de "usuário já existe"
    const uuid = Math.floor(Math.random() * 10000);
    
    cy.visit('/register');

    // Seletores baseados nos teus placeholders exatos
    cy.get('input[placeholder="Username"]').type(`user_${uuid}`);
    cy.get('input[placeholder="Nome Completo"]').type('John Doe Test');
    cy.get('input[placeholder="Email"]').type(`test_${uuid}@gmail.com`);
    cy.get('input[placeholder="Password"]').type('senha123');

    // Clica no botão de submeter
    cy.get('button[type="submit"]').click();

    // Se o registro funcionar, o teu código faz navigate("/login")
    // Então verificamos se a URL mudou para a página de login
    cy.url().should('include', '/login');
  });
});