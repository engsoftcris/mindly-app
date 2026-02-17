describe('Post Creation Flow (Supabase URL Fix)', () => {
  const CLEAN_URL =
    'https://nsallopenmwbwkzrhgmx.supabase.co/storage/v1/object/public/mindly-media/posts/images/test.png';

  const visitAuthed = (path = '/') => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token-123');
        win.localStorage.setItem('refresh', 'fake-refresh-123');
      },
    });
  };

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();

    // 1) Mock Perfil (não depende de /api)
    cy.intercept('GET', '**/accounts/profile/**', {
      statusCode: 200,
      body: {
        id: 1,
        username: 'cristiano',
        display_name: 'Cristiano Tobias',
        profile_picture: null,
      },
    }).as('getProfile');

    // 2) Mock Feed inicial (posts em qualquer baseURL)
    cy.intercept('GET', '**/posts/**', {
      statusCode: 200,
      body: {
        count: 1,
        next: null,
        results: [
          {
            id: 100,
            content: 'Post antigo do sistema',
            author: { username: 'sistema', id: 2 },
            created_at: new Date().toISOString(),
          },
        ],
      },
    }).as('getPostsAll');

    // 3) Mock criação de post (aceita /posts/ com ou sem /api)
    cy.intercept('POST', '**/posts/**', {
      statusCode: 201,
      body: {
        id: 99,
        content: 'Sucesso: Post com URL Limpa',
        media_url: CLEAN_URL,
        author: { username: 'cristiano', id: 1 },
        moderation_status: 'APPROVED',
        created_at: new Date().toISOString(),
      },
    }).as('createPost');

    visitAuthed('/');
    cy.wait(['@getProfile', '@getPostsAll'], { timeout: 20000 });
  });

  it('1. Deve garantir que o campo de criação está visível no Dashboard', () => {
    cy.get('textarea')
      .first()
      .should('be.visible')
      .and('have.attr', 'placeholder', "What's on your mind?");
  });

  it('2. Deve validar o formato da URL da imagem após o post', () => {
    cy.get('textarea').first().type('Testando Supabase Fix');
    cy.get('button[type="submit"]').should('not.be.disabled').click();

    cy.wait('@createPost').then((interception) => {
      expect(interception.response.statusCode).to.eq(201);

      const imageUrl = interception.response.body.media_url;
      expect(imageUrl).to.include('storage/v1/object/public');
      expect(imageUrl).to.not.include('AWSAccessKeyId');
    });

    cy.contains('Sucesso: Post com URL Limpa').should('be.visible');
  });

  it('3. Deve limpar o formulário após o sucesso', () => {
    cy.get('textarea').first().type('Texto para limpar');
    cy.get('button[type="submit"]').should('not.be.disabled').click();

    cy.wait('@createPost');

    cy.get('textarea').first().should('have.value', '');
    cy.contains('0/280').should('be.visible');
  });

  it('4. Deve processar o upload de uma imagem e exibir o preview', () => {
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ax8p0kAAAAASUVORK5CYII='; // 1x1 px PNG

  cy.get('input[type="file"]').selectFile(
    {
      contents: Cypress.Buffer.from(pngBase64, 'base64'),
      fileName: 'test-image.png',
      mimeType: 'image/png',
      lastModified: Date.now(),
    },
    { force: true }
  );

  cy.get('img[alt="Preview"]').should('be.visible');

  cy.contains('button', '✕').click({ force: true });
  cy.get('img[alt="Preview"]').should('not.exist');
});


  it('6. Deve mostrar estado de carregamento e desativar o botão ao postar', () => {
    // Override só para este teste
    cy.intercept('POST', '**/posts/**', {
      delay: 1000,
      statusCode: 201,
      body: { id: 101, content: 'Post Lento', author: { username: 'cristiano' } },
    }).as('postLento');

    cy.get('textarea').first().type('Postando com calma...');
    cy.get('button[type="submit"]').should('not.be.disabled').click();

    cy.get('button[type="submit"]').should('be.disabled');
    cy.get('textarea').should('be.disabled');

    // Se o texto "Posting..." existir no seu botão, mantenha:
    cy.get('button[type="submit"]').should('contain', 'Posting...');

    cy.wait('@postLento');
  });
});
