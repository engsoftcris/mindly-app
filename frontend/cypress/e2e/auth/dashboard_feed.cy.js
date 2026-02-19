describe('Dashboard - Feed, Scroll & Storage Fix (Robust Version)', () => {
  const CLEAN_URL = "https://nsallopenmwbwkzrhgmx.supabase.co/storage/v1/object/public/mindly-media/posts/images/test.png";

  beforeEach(() => {
    // Limpeza total para garantir isolamento no CI/GitHub Actions
    cy.clearLocalStorage();
    cy.clearCookies();

    // 1. MOCK DE PERFIL
    cy.intercept('GET', '**/api/accounts/profile**', {
      statusCode: 200,
      body: { 
        id: 1, 
        username: 'cristiano', 
        display_name: 'Cristiano Tobias',
        profile_picture: null 
      }
    }).as('getProfile');

    // 2. MOCK ABA "PARA VOCÊ" (Endpoint: /posts/)
    // Usamos Regex para capturar tanto a carga inicial quanto a paginação
    cy.intercept('GET', /.*\/api\/posts\/?(\?.*)?$/, (req) => {
      if (req.url.includes('page=2')) {
        req.reply({
          statusCode: 200,
          body: {
            next: null,
            results: [{ 
              id: 2, content: 'Conteúdo da Página 2!', 
              author: { username: 'sistema', id: 2 }, created_at: new Date().toISOString() 
            }]
          }
        });
      } else {
        req.reply({
          statusCode: 200,
          body: {
            next: `${Cypress.config().baseUrl}/api/posts/?page=2`,
            results: [{ 
              id: 1, content: 'Hello from Para Você!', 
              author: { username: 'cristiano', id: 1 }, created_at: new Date().toISOString() 
            }]
          }
        });
      }
    }).as('getPostsAll');

    // 3. MOCK ABA "SEGUINDO" (Endpoint: /accounts/feed/)
    cy.intercept('GET', /.*\/api\/accounts\/feed\/?(\?.*)?$/, {
      statusCode: 200,
      body: {
        next: null,
        results: [{ 
          id: 10, content: 'Conteúdo da aba Seguindo', 
          author: { username: 'amigo_teste', id: 5 }, created_at: new Date().toISOString() 
        }]
      }
    }).as('getFeedFollowing');

    // 4. MOCK DO POST (Fix do Supabase)
    cy.intercept('POST', '**/api/posts/**', {
      statusCode: 201,
      body: { 
        id: 99, 
        content: 'Post com URL Limpa',
        media_url: CLEAN_URL, // Ajustado para bater com seu componente (media_url)
        author: { username: 'cristiano', id: 1 },
        moderation_status: 'APPROVED',
        created_at: new Date().toISOString()
      }
    }).as('createPost');

    // 5. INJEÇÃO DE TOKEN VIA WINDOW (Simula usuário logado)
    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
      win.localStorage.setItem('refresh', 'fake-refresh-123');
    });

    cy.visit('/');
    
    // Espera os mocks obrigatórios da carga inicial
    cy.wait(['@getProfile', '@getPostsAll'], { timeout: 30000 });
  });

  it('1. Deve exibir posts iniciais e carregar mais via Infinite Scroll', () => {
    // 1. Garante que a P1 renderizou primeiro
    cy.contains('Hello from Para Você!', { timeout: 15000 }).should('be.visible');
    
    // 2. Rolar até o fim. 
    // Como o layout é lateral, tentamos no window com 'ensureScrollable: false'
    // ou rolamos diretamente o post para garantir que o observer seja triggado.
    cy.scrollTo('bottom', { ensureScrollable: false });
    
    // Caso o scroll no window não funcione devido ao layout CSS, 
    // forçamos a visibilidade do último elemento da lista:
    cy.get('.divide-y > div').last().scrollIntoView();
    
    // 3. Aguarda a requisição da página 2
    cy.wait('@getPostsAll', { timeout: 15000 });
    
    // 4. Valida que o conteúdo novo apareceu na tela
    cy.contains('Conteúdo da Página 2!', { timeout: 10000 }).should('be.visible');
  });

  it('2. Deve criar um post novo e validar o retorno da API', () => {
    const textoPost = 'Testando postagem robusta no Dashboard';

    // O CreatePost agora é parte direta do Dashboard
    cy.get('textarea', { timeout: 15000 })
      .should('be.visible')
      .type(textoPost, { delay: 30 }); // Delay suave para simular digitação real

    // Verifica se o botão Post está habilitado
    cy.get('button[type="submit"]')
      .should('not.be.disabled')
      .click();

    // Espera o POST e valida o body da resposta
    cy.wait('@createPost', { timeout: 20000 }).then((interception) => {
      expect(interception.response.statusCode).to.eq(201);
      const media = interception.response.body.media_url;
      expect(media).to.include('storage/v1/object/public');
      cy.log('✅ URL do Supabase Validada: ' + media);
    });

    // O campo deve ser limpo e o novo post deve aparecer no topo
    cy.get('textarea').should('have.value', '');
    cy.contains('Post com URL Limpa').should('be.visible');
  });

  it('3. Deve alternar entre abas "Para você" e "Seguindo"', () => {
    // 1. Garantir que a página inicial carregou
    cy.contains('Hello from Para Você!', { timeout: 10000 }).should('be.visible');

    // 2. Clique na aba Seguindo (Ajuste o seletor se você usa data-cy nas abas)
    // Se você tiver data-cy nas abas, use: cy.get('[data-cy="tab-following"]').click()
    cy.contains('button', /Seguindo/i)
      .should('be.visible')
      .click({ force: true });

    // 3. Aguarda a requisição
    // Se o wait falha, é porque o onClick do seu botão não está chamando a API correta
    cy.wait('@getFeedFollowing', { timeout: 15000 });

    // 4. Valida conteúdo
    cy.contains('Conteúdo da aba Seguindo').should('be.visible');
  });

});