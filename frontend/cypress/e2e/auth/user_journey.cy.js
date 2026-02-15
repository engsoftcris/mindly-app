Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

describe('Mindly - Jornada Completa do Utilizador', () => {
  
  // Roda antes de QUALQUER teste deste arquivo
  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearLocalStorage();

    // Mocks globais para garantir que os aliases existam em todos os testes
    cy.intercept('GET', '**/api/accounts/profile**', {
      statusCode: 200,
      body: { id: '123', username: 'testuser', display_name: 'Teste Cypress', profile_picture: null }
    }).as('getProfile');

    cy.intercept('GET', '**/api/posts/**', {
        statusCode: 200,
        body: { count: 0, next: null, results: [] }
    }).as('getPostsInitial');

    // Token fake
    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });
  });

  describe('Navegação e Dashboard', () => {
    it('1. Deve carregar as abas e persistir no Refresh (F5)', () => {
      cy.visit('/');
      cy.wait(['@getProfile', '@getPostsInitial']);
      
      cy.contains('button', 'Para você').should('be.visible');
      
      cy.reload();
      cy.wait(['@getProfile', '@getPostsInitial']);
      cy.url().should('not.include', '/login');
      cy.contains('button', 'Para você').should('be.visible');
    });

    it('2. Deve navegar para Configurações via Navbar', () => {
      cy.visit('/');
      cy.wait(['@getProfile', '@getPostsInitial']);

      // Usamos force:true porque em certas resoluções o link pode estar sobreposto
      cy.get('nav').contains(/Profile|Perfil/i).click({ force: true });
      cy.url().should('include', '/profile');
    });

    it('3. Deve realizar o logout corretamente', () => {
      cy.visit('/');
      cy.wait(['@getProfile', '@getPostsInitial']);

      cy.get('button').contains(/Logout|Sair/i).click({ force: true });
      cy.window().should((win) => {
        expect(win.localStorage.getItem('access')).to.be.null;
      });
      cy.url().should('include', '/login');
    });
  });

  describe('Postagem e Media', () => {
   it('4. Deve permitir postar texto e limpar o campo', () => {
      cy.intercept('POST', '**/api/posts/', {
        statusCode: 201,
        body: { id: 99, content: 'Sucesso!', author: { username: 'testuser' } }
      }).as('createPost');

      cy.visit('/');
      
      // 1. Esperamos o carregamento inicial terminar
      cy.wait(['@getProfile', '@getPostsInitial']);

      // 2. AGUARDAMOS o textarea sair do estado disabled (esperando o loading do dashboard sumir)
      cy.get('textarea', { timeout: 15000 }).should('not.be.disabled');

      // 3. Agora digitamos com segurança
      cy.get('textarea').first().type('Teste final de fluxo', { delay: 30 });
      
      // 4. O botão deve habilitar após o texto
      cy.get('button[type="submit"]')
        .should('not.be.disabled')
        .click();
      
      // 5. Validação final
      cy.wait('@createPost');
      cy.get('textarea').should('have.value', '');
    });
  });

  describe('Responsividade Mobile', () => {
    it('5. Deve ajustar layout para iPhone (Mobile)', () => {
      cy.viewport('iphone-xr');
      cy.visit('/');
      
      // No mobile, esperamos que o Dashboard ainda carregue os posts
      cy.wait(['@getProfile', '@getPostsInitial']);
      
      // Verificamos se as abas existem (mesmo que o texto mude, o botão deve estar lá)
      cy.get('button').contains(/Para você|For You/i).should('be.visible');
    });
  });
});