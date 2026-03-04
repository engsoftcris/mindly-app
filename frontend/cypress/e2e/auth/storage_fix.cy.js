describe('Mindly - Suite de Testes: Storage e Moderação (Layout Dashboard)', () => {
  const MOCK_UUID = 'b369ce73-66ba-4dc9-a736-d79eb3e45e5b';
  const CLEAN_URL =
    'https://nsallopenmwbwkzrhgmx.supabase.co/storage/v1/object/public/mindly-media/posts/images/test.png';
  const VIDEO_URL = 'https://example.com/video-teste.mp4';

  const visitAuthed = (path = '/') => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token-123');
        win.localStorage.setItem('refresh', 'fake-refresh-123');
      },
    });
  };

  const profileRootUrl = '**/api/accounts/profile/**';
  const feedUrl = '**/api/accounts/feed/**';

  const createMockPost = (status, content) => ({
    id: 10,
    author: { 
      username: 'cristiano', 
      id: 1, 
      profile_picture: null,
      display_name: 'Cristiano'
    },
    content,
    media_url: VIDEO_URL,
    moderation_status: status,
    created_at: new Date().toISOString(),
  });

  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearLocalStorage();
    cy.clearCookies();

    cy.intercept('GET', profileRootUrl, {
      statusCode: 200,
      body: { id: MOCK_UUID, username: 'cristiano', display_name: 'Cristiano' },
    }).as('getProfile');

    cy.intercept('GET', '**/api/notifications/**', { statusCode: 200, body: [] }).as('getNotifications');
    cy.intercept('GET', '**/api/accounts/suggested-follows/**', { statusCode: 200, body: [] }).as('getSuggestions');
  });

  context('Storage & URL Clean Fix', () => {
    beforeEach(() => {
      cy.intercept('GET', feedUrl, {
        statusCode: 200,
        body: { count: 0, next: null, results: [] },
      }).as('getPostsAll');

      cy.intercept('POST', '**/api/posts/**', {
        statusCode: 201,
        body: {
          id: 999,
          content: 'URL Fix Test',
          media_url: CLEAN_URL,
          author: { username: 'cristiano', id: 1, profile_picture: null },
          moderation_status: 'APPROVED',
          created_at: new Date().toISOString(),
        },
      }).as('createPost');

      visitAuthed('/');
      cy.wait(['@getProfile', '@getPostsAll', '@getNotifications', '@getSuggestions'], { timeout: 25000 });
    });

    it('1. Deve encontrar o campo de postagem já aberto no topo da página', () => {
      cy.get('textarea', { timeout: 15000 })
        .first()
        .should('be.visible')
        .and('have.attr', 'placeholder', "What's on your mind?");
    });

    it('2. Deve validar o formato da URL no POST (Storage Fix)', () => {
      // Digitar no textarea
      cy.get('textarea')
        .first()
        .should('be.visible')
        .type('Validando link do Supabase...', { delay: 0 });

      // CORREÇÃO: O botão pode estar em outro local ou ter seletor diferente
      cy.get('button', { timeout: 10000 })
        .contains(/Post/i)
        .should('be.visible')
        .and('not.be.disabled')
        .click();

      cy.wait('@createPost', { timeout: 20000 }).then((interception) => {
        const imageUrl = interception.response.body.media_url;
        expect(imageUrl).to.not.include('/s3/');
        expect(imageUrl).to.include('storage/v1/object/public');
      });
    });
  });

  context('Moderação de Conteúdo (Visual)', () => {
    it('3. Deve aplicar BLUR em mídia PENDING', () => {
      cy.intercept('GET', feedUrl, {
        statusCode: 200,
        body: { 
          count: 1, 
          next: null, 
          results: [createMockPost('PENDING', 'Em análise')] 
        },
      }).as('getPending');

      visitAuthed('/');
      cy.wait(['@getProfile', '@getPending', '@getNotifications', '@getSuggestions'], { timeout: 10000 });

      cy.get('[class*="blur-2xl"]', { timeout: 10000 }).should('exist');
      cy.contains(/Content under review|under review/i).should('be.visible');
    });

    it('4. Deve remover mídia e mostrar aviso em REJECTED', () => {
      cy.intercept('GET', feedUrl, {
        statusCode: 200,
        body: { 
          count: 1, 
          next: null, 
          results: [createMockPost('REJECTED', 'Conteúdo Proibido')] 
        },
      }).as('getRejected');

      visitAuthed('/');
      cy.wait(['@getProfile', '@getRejected', '@getNotifications', '@getSuggestions'], { timeout: 10000 });

      // CORREÇÃO: O post rejeitado tem uma div específica
      cy.get('.bg-red-900\\/5', { timeout: 10000 }).should('exist');
      cy.contains(/Content removed|violating guidelines/i).should('be.visible');
      
      cy.get('video').should('not.exist');
      cy.get('img[alt="Post media"]').should('not.exist');
    });

    it('5. Deve exibir mídia normalmente em APPROVED', () => {
      // CORREÇÃO: Garantir que o post está APPROVED e sem blur
      const approvedPost = createMockPost('APPROVED', 'Tudo liberado');
      
      cy.intercept('GET', feedUrl, {
        statusCode: 200,
        body: { 
          count: 1, 
          next: null, 
          results: [approvedPost] 
        },
      }).as('getApproved');

      visitAuthed('/');
      cy.wait(['@getProfile', '@getApproved', '@getNotifications', '@getSuggestions'], { timeout: 10000 });

      cy.get('video', { timeout: 10000 })
        .should('exist')
        .and('not.have.class', 'blur-2xl')
        .and('have.attr', 'controls');
    });
  });
});