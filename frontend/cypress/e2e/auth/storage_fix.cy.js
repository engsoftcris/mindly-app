describe('Mindly - Suite de Testes: Storage e Moderação (Layout Dashboard)', () => {
  const MOCK_UUID = 'b369ce73-66ba-4dc9-a736-d79eb3e45e5b';
  const CLEAN_URL = "https://nsallopenmwbwkzrhgmx.supabase.co/storage/v1/object/public/mindly-media/posts/images/test.png";
  const VIDEO_URL = "https://example.com/video-teste.mp4";

  beforeEach(() => {
    // Define o tamanho da tela para garantir que o layout desktop apareça
    cy.viewport(1280, 800);
    cy.clearLocalStorage();

    cy.intercept('GET', '**/api/accounts/profile**', {
      statusCode: 200,
      body: { id: MOCK_UUID, username: 'cristiano', display_name: 'Cristiano' }
    }).as('getProfile');

    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });
  });

  context('Storage & URL Clean Fix', () => {
    beforeEach(() => {
      // Intercepta a carga inicial da aba 'Para você'
      cy.intercept('GET', '**/api/posts/**', { statusCode: 200, body: { results: [] } }).as('getPostsAll');
      
      cy.intercept('POST', '**/api/posts/**', {
        statusCode: 201,
        body: { 
          id: 999, 
          content: 'URL Fix Test', 
          media_url: CLEAN_URL, 
          author: { username: 'cristiano', id: 1 },
          moderation_status: 'APPROVED',
          created_at: new Date().toISOString()
        }
      }).as('createPost');
      
      cy.visit('/');
      cy.wait(['@getProfile', '@getPostsAll'], { timeout: 25000 });
    });

   it('1. Deve encontrar o campo de postagem já aberto no topo da página', () => {
      // Usamos 'have.attr' para validar o placeholder corretamente
      cy.get('textarea', { timeout: 15000 })
        .should('be.visible')
        .and('have.attr', 'placeholder', "What's on your mind?");
    });

    it('2. Deve validar o formato da URL no POST (Storage Fix)', () => {
      cy.get('textarea').first().type('Validando link do Supabase...', { delay: 30 });
      cy.get('button[type="submit"]').should('not.be.disabled').click();
      
      cy.wait('@createPost', { timeout: 20000 }).then((interception) => {
        const imageUrl = interception.response.body.media_url;
        expect(imageUrl).to.not.include('/s3/'); 
        expect(imageUrl).to.include('storage/v1/object/public');
        cy.log('✅ URL Limpa: ' + imageUrl);
      });
    });
  });

  context('Moderação de Conteúdo (Visual)', () => {
    const mockPost = (status, content) => ({
      id: 10, 
      author: { username: 'cristiano', id: 1 }, 
      content: content,
      media_url: VIDEO_URL, 
      moderation_status: status, 
      created_at: new Date().toISOString()
    });

    it('3. Deve aplicar BLUR em mídia PENDING', () => {
      cy.intercept('GET', '**/api/posts/**', {
        statusCode: 200,
        body: { results: [mockPost('PENDING', 'Em análise')] }
      }).as('getPending');

      cy.visit('/');
      cy.wait(['@getProfile', '@getPending']);
      
      // Verifica a classe de blur que você definiu no Dashboard.jsx
      cy.get('video').should('have.class', 'blur-2xl');
      cy.contains('Conteúdo em Análise').should('be.visible');
    });

    it('4. Deve remover mídia e mostrar aviso em REJECTED', () => {
      cy.intercept('GET', '**/api/posts/**', {
        statusCode: 200,
        body: { results: [mockPost('REJECTED', 'Conteúdo Proibido')] }
      }).as('getRejected');

      cy.visit('/');
      cy.wait(['@getProfile', '@getRejected']);
      
      // O vídeo não deve ser renderizado
      cy.get('video').should('not.exist');
      // Texto exato do seu componente
      cy.contains('Conteúdo removido por violação das diretrizes.').should('be.visible');
    });

    it('5. Deve exibir mídia normalmente em APPROVED', () => {
      cy.intercept('GET', '**/api/posts/**', {
        statusCode: 200,
        body: { results: [mockPost('APPROVED', 'Tudo liberado')] }
      }).as('getApproved');

      cy.visit('/');
      cy.wait(['@getProfile', '@getApproved']);
      
      cy.get('video').should('not.have.class', 'blur-2xl');
      cy.get('video').should('have.attr', 'controls');
    });
  });
});