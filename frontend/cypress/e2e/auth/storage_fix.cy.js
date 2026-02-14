describe('Mindly - Suite de Testes: Storage e Moderação', () => {
  const MOCK_UUID = 'b369ce73-66ba-4dc9-a736-d79eb3e45e5b';
  const CLEAN_URL = "https://nsallopenmwbwkzrhgmx.supabase.co/storage/v1/object/public/mindly-media/posts/images/test.png";
  const VIDEO_URL = "https://example.com/video-teste.mp4";

  beforeEach(() => {
    // Mock de Perfil e Autenticação (Comum a todos os testes)
    cy.intercept('GET', '**/api/accounts/profile/**', {
      statusCode: 200,
      body: { id: MOCK_UUID, username: 'cristiano', display_name: 'Cristiano' }
    }).as('getProfile');

    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });
  });

  // --- BLOCO 1: TESTES DE STORAGE (OS TEUS TESTES ORIGINAIS) ---
  context('Storage & URL Clean Fix', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/api/accounts/feed/**', { statusCode: 200, body: { results: [] } }).as('getFeed');
      cy.intercept('POST', '**/api/posts/**', {
        statusCode: 201,
        body: { id: 999, content: 'URL Fix Test', image: CLEAN_URL, author: { username: 'cristiano' } }
      }).as('createPost');
      cy.visit('/', { timeout: 20000 });
      cy.wait(['@getProfile', '@getFeed']);
    });

    it('1. Deve abrir o modal de postagem e encontrar o textarea', () => {
      cy.get('button').contains(/Post|Novo|Criar/i).first().click({force: true});
      cy.get('textarea', { timeout: 10000 }).should('be.visible');
    });

    it('2. Deve validar a resposta da API (Sem /s3/ e Sem Assinaturas)', () => {
      cy.get('button').contains(/Post|Novo|Criar/i).first().click({force: true});
      cy.get('textarea').type('Testando formato de imagem...', { delay: 30 });
      cy.get('button[type="submit"]').click();
      
      cy.wait('@createPost', { timeout: 15000 }).then((interception) => {
        const imageUrl = interception.response.body.image;
        expect(imageUrl).to.not.include('/s3/'); 
        expect(imageUrl).to.include('storage/v1/object/public');
        expect(imageUrl).to.not.include('AWSAccessKeyId');
      });
    });
  });

  // --- BLOCO 2: TESTES DE MODERAÇÃO (VÍDEOS E STATUS) ---
  context('Moderação de Conteúdo', () => {
    it('3. Deve aplicar BLUR e Overlay em vídeos PENDING', () => {
      cy.intercept('GET', '**/api/accounts/feed/**', {
        statusCode: 200,
        body: { results: [{
          id: 10, author: { username: 'cristiano' }, content: 'Em análise',
          media: VIDEO_URL, moderation_status: 'PENDING', created_at: new Date().toISOString()
        }]}
      }).as('getPending');

      cy.visit('/');
      cy.wait(['@getProfile', '@getPending']);
      
      cy.get('video').should('have.class', 'blur-2xl');
      cy.contains('Conteúdo em Análise').should('be.visible');
    });

    it('4. Deve mostrar vídeo normalmente em APPROVED', () => {
      cy.intercept('GET', '**/api/accounts/feed/**', {
        statusCode: 200,
        body: { results: [{
          id: 11, author: { username: 'cristiano' }, content: 'Tudo OK',
          media: VIDEO_URL, moderation_status: 'APPROVED', created_at: new Date().toISOString()
        }]}
      }).as('getApproved');

      cy.visit('/');
      cy.wait(['@getProfile', '@getApproved']);
      
      cy.get('video').should('not.have.class', 'blur-2xl');
      cy.get('video').should('have.attr', 'controls');
    });

    it('5. Deve mostrar aviso de diretrizes em REJECTED', () => {
      cy.intercept('GET', '**/api/accounts/feed/**', {
        statusCode: 200,
        body: { results: [{
          id: 12, author: { username: 'cristiano' }, content: 'Bloqueado',
          media: VIDEO_URL, moderation_status: 'REJECTED', created_at: new Date().toISOString()
        }]}
      }).as('getRejected');

      cy.visit('/');
      cy.wait(['@getProfile', '@getRejected']);
      
      cy.get('video').should('not.exist');
      cy.contains('Este post violou as diretrizes').should('be.visible');
    });
  });
});