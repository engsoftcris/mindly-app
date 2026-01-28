describe('Fluxo de Login Social (Página de Login)', () => {
  it('Deve exibir o botão de Login do Google', () => {
    cy.visit('/login');
    cy.contains('button', /Google/i).should('be.visible');
  });

  it('Deve permitir que o utilizador clique no botão de Google', () => {
    cy.visit('/login');
    // Verifica se o botão está habilitado e contém o texto correto
    cy.get('button').contains(/Google/i).should('not.be.disabled');
  });
});

describe('Fluxo do Dashboard (Utilizador Autenticado)', () => {

  beforeEach(() => {
    cy.clearLocalStorage();

    // Mock da API - Exatamente como o teu Dashboard.jsx espera
    cy.intercept('GET', '**/api/accounts/profile/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        full_name: 'Teste Cypress',
        profile_picture: 'https://via.placeholder.com/150',
        provider: 'google',
        is_private: true
      }
    }).as('getProfile');

    // Injeta o token no localStorage para simular sessão ativa
    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });
  });

  it('Deve carregar o Dashboard e mostrar as informações do utilizador', () => {
    cy.visit('/');
    cy.wait('@getProfile');

    // 1. Verifica o título de boas-vindas
    cy.get('h1').should('contain', 'Olá, Teste Cypress!');

    // 2. Verifica a imagem de perfil (pelo alt definido no teu código)
    cy.get('img[alt="Profile"]')
      .should('be.visible')
      .and('have.attr', 'src', 'https://via.placeholder.com/150');

    // 3. Verifica o Status da Conta (Cadeado do is_private)
    cy.contains('🔒 Conta Privada').should('be.visible');

    // 4. Verifica o Provedor (Usando regex para evitar erro de Case Sensitive)
    cy.contains(/google/i).should('be.visible');
  });

  it('Deve realizar o logout através do botão do Dashboard', () => {
    cy.visit('/');
    cy.wait('@getProfile');

    // Clica no botão "Sair da conta" definido no teu Dashboard.jsx
    cy.contains('button', /Sair da conta/i).click();

    // Valida se limpou o token e redirecionou para o login
    cy.window().should((win) => {
      expect(win.localStorage.getItem('access')).to.be.null;
    });
    cy.url().should('include', '/login');
  });
});

describe('Segurança de Acesso (Privacidade)', () => {
  it('Deve redirecionar para /login ao tentar aceder à raiz sem estar autenticado', () => {
    // Garante que não há token
    cy.clearLocalStorage();
    
    // Tenta visitar a Home (que é protegida pelo PrivateRoute no teu App.jsx)
    cy.visit('/'); 
    
    // Verifica se o redirecionamento para o login aconteceu
    cy.url().should('include', '/login');
    cy.contains('Mindly').should('be.visible');
  });
});