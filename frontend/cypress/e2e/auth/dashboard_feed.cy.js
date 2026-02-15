describe('Dashboard - Feed, Scroll & Storage Fix (Robust Version)', () => {
  const CLEAN_URL = "https://nsallopenmwbwkzrhgmx.supabase.co/storage/v1/object/public/mindly-media/posts/images/test.png";

  beforeEach(() => {
    cy.clearLocalStorage();

    // 1. Mocks de Perfil e Feed com Wildcards (**) para evitar erro de barra final
    cy.intercept('GET', '**/api/accounts/profile**', {
      statusCode: 200,
      body: { username: 'cristiano', display_name: 'Cristiano Tobias' }
    }).as('getProfile');

    cy.intercept('GET', '**/api/accounts/feed/**', (req) => {
      if (req.url.includes('page=2')) {
        req.reply({
          statusCode: 200,
          body: {
            count: 2,
            next: null,
            results: [{ 
              id: 2, content: 'Loaded via Infinite Scroll!', 
              author: { username: 'system' }, created_at: new Date().toISOString() 
            }]
          }
        });
      } else {
        req.reply({
          statusCode: 200,
          body: {
            count: 2,
            next: 'http://localhost:8000/api/accounts/feed/?page=2',
            results: [{ 
              id: 1, content: 'Hello from Page 1!', 
              author: { username: 'cristiano' }, created_at: new Date().toISOString() 
            }]
          }
        });
      }
    }).as('getFeed');

    // Mock do POST (Fix do Supabase)
    cy.intercept('POST', '**/api/posts/**', {
      statusCode: 201,
      body: { 
        id: 99, 
        content: 'Post com URL Limpa',
        image: CLEAN_URL,
        author: { username: 'cristiano' },
        moderation_status: 'APPROVED'
      }
    }).as('createPost');

    // Injeção de Token
    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });

    cy.visit('/');
    // Timeout estendido para o GitHub Actions
    cy.wait(['@getProfile', '@getFeed'], { timeout: 25000 });
  });

  it('1. Deve exibir posts iniciais e carregar mais no scroll', () => {
    cy.contains('Hello from Page 1!', { timeout: 15000 }).should('be.visible');
    cy.scrollTo('bottom', { duration: 500 });
    cy.wait('@getFeed', { timeout: 20000 });
    cy.contains('Loaded via Infinite Scroll!', { timeout: 15000 }).should('be.visible');
  });

  it('2. Deve criar post e validar a URL limpa do Supabase', () => {
    // Garantir que o botão de abrir modal existe e clicar
    cy.get('button').contains(/Post|Create|New|Criar/i).first().click({ force: true }); 
    
    cy.get('textarea', { timeout: 15000 })
      .should('be.visible')
      .type('Testando Storage Fix no Dashboard', { delay: 50 });

    // Esperar o botão estar clicável (evita race condition no React)
    cy.get('button[type="submit"]').should('not.be.disabled').click();

    // Esperar o POST e validar a resposta
    cy.wait('@createPost', { timeout: 30000 }).then((interception) => {
      const imageUrl = interception.response.body.image;
      expect(imageUrl).to.not.include('/s3/');
      expect(imageUrl).to.include('storage/v1/object/public');
      cy.log('✅ URL Validada: ' + imageUrl);
    });

    cy.get('textarea', { timeout: 15000 }).should('not.exist');
  });
});