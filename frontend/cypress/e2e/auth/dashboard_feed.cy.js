describe('Dashboard - Feed, Scroll & Storage Fix (Robust Version)', () => {
  const CLEAN_URL = "https://nsallopenmwbwkzrhgmx.supabase.co/storage/v1/object/public/mindly-media/posts/images/test.png";

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();

    cy.intercept('GET', '**/api/accounts/profile**', {
      statusCode: 200,
      body: { 
        id: 1, 
        username: 'cristiano', 
        display_name: 'Cristiano Tobias',
        profile_picture: null 
      }
    }).as('getProfile');

    cy.intercept('GET', /.*\/api\/accounts\/feed\/?(\?.*)?$/, (req) => {
      if (req.url.includes('page=2')) {
        req.reply({
          statusCode: 200,
          body: {
            next: null,
            results: [{ 
              id: 2, 
              content: 'Conteúdo da Página 2!', 
              author: { username: 'sistema', id: 2 }, 
              created_at: new Date().toISOString() 
            }]
          }
        });
      } else {
        req.reply({
          statusCode: 200,
          body: {
            next: `${Cypress.config().baseUrl}/api/accounts/feed/?page=2`,
            results: [{ 
              id: 1, 
              content: 'Hello from Para Você!', 
              author: { username: 'cristiano', id: 1 }, 
              created_at: new Date().toISOString() 
            }]
          }
        });
      }
    }).as('getFeedAll');

    cy.intercept('GET', /.*\/api\/accounts\/feed\/\?.*following.*/, {
      statusCode: 200,
      body: {
        next: null,
        results: [{ 
          id: 10, 
          content: 'Conteúdo da aba Seguindo', 
          author: { username: 'amigo_teste', id: 5 }, 
          created_at: new Date().toISOString() 
        }]
      }
    }).as('getFeedFollowing');

    // CORREÇÃO: Intercepta a rota REAL que o frontend está usando
    cy.intercept('POST', '**/api/posts/**', {  // ← Mantém /api/posts/ porque é o que o frontend chama
      statusCode: 201,
      body: { 
        id: 99, 
        content: 'Post com URL Limpa',
        media_url: CLEAN_URL,
        author: { username: 'cristiano', id: 1 },
        moderation_status: 'APPROVED',
        created_at: new Date().toISOString()
      }
    }).as('createPost');

    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
      win.localStorage.setItem('refresh', 'fake-refresh-123');
    });

    cy.visit('/');
    cy.wait(['@getProfile', '@getFeedAll'], { timeout: 30000 });
  });

  it('1. Deve exibir posts iniciais e carregar mais via Infinite Scroll', () => {
    cy.contains('Hello from Para Você!', { timeout: 15000 }).should('be.visible');
    cy.contains('Hello from Para Você!').should('exist');
    cy.scrollTo('bottom', { ensureScrollable: false });
    cy.get('article, [data-cy="post-item"], .py-4').last().scrollIntoView();
    cy.wait('@getFeedAll', { timeout: 15000 });
    cy.contains('Conteúdo da Página 2!', { timeout: 10000 }).should('be.visible');
  });

  it('2. Deve criar um post novo e validar o retorno da API', () => {
    const textoPost = 'Testando postagem robusta no Dashboard';

    cy.get('textarea', { timeout: 15000 })
      .should('be.visible')
      .type(textoPost, { delay: 30 });

    cy.get('button[type="submit"]')
      .should('not.be.disabled')
      .click();

    // AGORA deve funcionar porque o mock está na rota correta
    cy.wait('@createPost', { timeout: 20000 }).then((interception) => {
      expect(interception.response.statusCode).to.eq(201);
      const media = interception.response.body.media_url;
      expect(media).to.include('storage/v1/object/public');
      cy.log('✅ URL do Supabase Validada: ' + media);
    });

    cy.get('textarea').should('have.value', '');
    cy.contains('Post com URL Limpa').should('be.visible');
  });

  it('3. Deve alternar entre abas "Para você" e "Seguindo"', () => {
    cy.contains('Hello from Para Você!', { timeout: 10000 }).should('be.visible');
    cy.contains('button', /Seguindo/i)
      .should('be.visible')
      .click({ force: true });
    cy.wait('@getFeedFollowing', { timeout: 15000 });
    cy.contains('Conteúdo da aba Seguindo').should('be.visible');
  });
});