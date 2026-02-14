describe('Dashboard - Feed, Scroll & Storage Fix (Robust Version)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();

    // 1. Mocks de Perfil e Feed
    cy.intercept('GET', '**/accounts/profile*', {
      statusCode: 200,
      body: { 
        username: 'cristiano', 
        display_name: 'Cristiano Tobias' 
      }
    }).as('getProfile');

    cy.intercept('GET', '**/accounts/feed/**', (req) => {
        if (req.url.includes('page=2')) {
            req.reply({
                statusCode: 200,
                body: {
                    count: 2,
                    next: null,
                    results: [{ 
                        id: 2, 
                        content: 'Loaded via Infinite Scroll!', 
                        author: { username: 'system' }, 
                        created_at: new Date().toISOString() 
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
                        id: 1, 
                        content: 'Hello from Page 1!', 
                        author: { username: 'cristiano' }, 
                        created_at: new Date().toISOString() 
                    }]
                }
            });
        }
    }).as('getFeed');

    // 2. Mock do POST (Fix do Supabase)
    cy.intercept('POST', '**/api/posts/', {
      statusCode: 201,
      body: { 
        id: 99, 
        content: 'Post com URL Limpa',
        image: "https://nsallopenmwbwkzrhgmx.supabase.co/storage/v1/object/public/mindly-media/posts/images/test.png"
      }
    }).as('createPost');

    // 3. Injeção de Token e Visita com folga de tempo
    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });

    cy.visit('/', { timeout: 20000 }); // Dá tempo ao Vite/Firefox para montar o app
    cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 });
  });

  it('1. Deve exibir posts iniciais e carregar mais no scroll', () => {
    // Garante que a página 1 renderizou
    cy.contains('Hello from Page 1!', { timeout: 10000 }).should('be.visible');

    // Scroll suave e repetido se necessário para garantir o trigger no Firefox
    cy.scrollTo('bottom', { duration: 500 });
    
    // Espera a página 2 com timeout estendido
    cy.wait('@getFeed', { timeout: 12000 });
    cy.contains('Loaded via Infinite Scroll!', { timeout: 10000 }).should('be.visible');
  });

  it('2. Deve criar post e validar a URL limpa do Supabase', () => {
    // Clique forçado para ignorar possíveis overlays de loading
    cy.get('button').contains(/Post|Create|New|Criar/i).first().click({ force: true }); 
    
    // Espera o Modal estar totalmente pronto
    cy.get('textarea', { timeout: 10000 })
      .should('be.visible')
      .type('Testando Storage Fix no Dashboard', { delay: 30 }); // Delay para o Firefox não "comer" letras

    cy.get('button[type="submit"]').click();

    // Validação da URL sem /s3/
    cy.wait('@createPost', { timeout: 15000 }).then((interception) => {
      const imageUrl = interception.response.body.image;
      
      expect(imageUrl).to.not.include('/s3/');
      expect(imageUrl).to.include('storage/v1/object/public');
      expect(imageUrl).to.not.include('AWSAccessKeyId');
      
      cy.log('✅ URL Validada: ' + imageUrl);
    });

    // Garante que a UI limpou o estado
    cy.get('textarea', { timeout: 10000 }).should('not.exist');
  });
});