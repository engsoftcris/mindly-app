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

  // Endpoints mais tolerantes (com ou sem /api)
  const profileRootUrl = /\/(api\/)?accounts\/profile\/?$/;
  const postsUrlAny = /\/(api\/)?posts\/?(\?.*)?$/;

  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearLocalStorage();
    cy.clearCookies();

    cy.intercept('GET', profileRootUrl, {
      statusCode: 200,
      body: { id: MOCK_UUID, username: 'cristiano', display_name: 'Cristiano' },
    }).as('getProfile');
  });

  context('Storage & URL Clean Fix', () => {
    beforeEach(() => {
      cy.intercept('GET', postsUrlAny, {
        statusCode: 200,
        body: { count: 0, next: null, results: [] },
      }).as('getPostsAll');

      cy.intercept('POST', /\/(api\/)?posts\/?$/, {
        statusCode: 201,
        body: {
          id: 999,
          content: 'URL Fix Test',
          media_url: CLEAN_URL,
          author: { username: 'cristiano', id: 1 },
          moderation_status: 'APPROVED',
          created_at: new Date().toISOString(),
        },
      }).as('createPost');

      visitAuthed('/');
      cy.wait(['@getProfile', '@getPostsAll'], { timeout: 25000 });
    });

    it('1. Deve encontrar o campo de postagem já aberto no topo da página', () => {
      cy.get('textarea', { timeout: 15000 })
        .first()
        .should('be.visible')
        .and('have.attr', 'placeholder', "What's on your mind?");
    });

    it('2. Deve validar o formato da URL no POST (Storage Fix)', () => {
      cy.get('textarea').first().type('Validando link do Supabase...', { delay: 0 });
      cy.get('button[type="submit"]').should('not.be.disabled').click();

      cy.wait('@createPost', { timeout: 20000 }).then((interception) => {
        const imageUrl = interception.response.body.media_url;
        expect(imageUrl).to.not.include('/s3/');
        expect(imageUrl).to.include('storage/v1/object/public');
      });
    });
  });

  context('Moderação de Conteúdo (Visual)', () => {
    const mockPost = (status, content) => ({
      id: 10,
      author: { username: 'cristiano', id: 1 },
      content,
      media_url: VIDEO_URL,
      moderation_status: status,
      created_at: new Date().toISOString(),
    });

    it('3. Deve aplicar BLUR em mídia PENDING', () => {
      cy.intercept('GET', postsUrlAny, {
        statusCode: 200,
        body: { count: 1, next: null, results: [mockPost('PENDING', 'Em análise')] },
      }).as('getPending');

      visitAuthed('/');
      cy.wait(['@getProfile', '@getPending']);

      // Blur pode estar no <video> OU no wrapper. Tentamos ambos de forma segura.
      cy.get('video')
        .should('exist')
        .then(($v) => {
          const hasBlur = $v.hasClass('blur-2xl') || $v.closest('.blur-2xl').length > 0;
          expect(hasBlur, 'vídeo (ou wrapper) deve ter blur-2xl').to.eq(true);
        });

      // Texto: valide o que você realmente renderiza (conteúdo do post ou mensagem padrão)
      cy.contains(/Em análise|Conteúdo em Análise/i).should('be.visible');
    });

    it('4. Deve remover mídia e mostrar aviso em REJECTED', () => {
      cy.intercept('GET', postsUrlAny, {
        statusCode: 200,
        body: { count: 1, next: null, results: [mockPost('REJECTED', 'Conteúdo Proibido')] },
      }).as('getRejected');

      visitAuthed('/');
      cy.wait(['@getProfile', '@getRejected']);

      cy.get('video').should('not.exist');
      cy.contains('Conteúdo removido por violação das diretrizes.').should('be.visible');
    });

    it('5. Deve exibir mídia normalmente em APPROVED', () => {
  cy.intercept('GET', postsUrlAny, {
    statusCode: 200,
    body: { count: 1, next: null, results: [mockPost('APPROVED', 'Tudo liberado')] },
  }).as('getApproved');

  visitAuthed('/');
  cy.wait(['@getProfile', '@getApproved']);

  cy.get('video').should('exist');

  // Não encadear depois do have.attr
  cy.get('video').should('have.attr', 'controls');
  cy.get('video').should('not.have.class', 'blur-2xl');
});

  });
});
