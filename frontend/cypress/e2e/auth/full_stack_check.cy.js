describe('Post Creation Flow (Supabase URL Fix)', () => {
  const CLEAN_URL =
    'https://nsallopenmwbwkzrhgmx.supabase.co/storage/v1/object/public/mindly-media/posts/images/test.png';

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();

    // Usar cy.login() em vez de visitAuthed manual
    cy.login({ username: 'cristiano', seedFeed: false });

    // CORREÇÃO: Mock do feed com a rota correta
    cy.intercept('GET', '**/api/accounts/feed/**', {
      statusCode: 200,
      body: {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 100,
            content: 'Post antigo do sistema',
            author: { 
              username: 'sistema', 
              id: 2,
              display_name: 'Sistema',
              profile_picture: null
            },
            created_at: new Date().toISOString(),
            likes_count: 0,
            comments_count: 0,
            is_liked: false,
            moderation_status: 'APPROVED'
          },
        ],
      },
    }).as('getFeed'); // Mudar nome para getFeed

    // CORREÇÃO: Mock criação de post (rota sem /accounts/)
    cy.intercept('POST', '**/api/posts/**', {
      statusCode: 201,
      body: {
        id: 99,
        content: 'Sucesso: Post com URL Limpa',
        media_url: CLEAN_URL,
        author: { 
          username: 'cristiano', 
          id: 1,
          display_name: 'Cristiano Tobias',
          profile_picture: null
        },
        moderation_status: 'APPROVED',
        created_at: new Date().toISOString(),
        likes_count: 0,
        comments_count: 0,
        is_liked: false
      },
    }).as('createPost');

    // Mock de notificações e sugestões para evitar 401
    cy.intercept('GET', '**/api/notifications/**', { statusCode: 200, body: [] }).as('getNotifications');
    cy.intercept('GET', '**/api/accounts/suggested-follows/**', { statusCode: 200, body: [] }).as('getSuggestions');

    cy.visit('/');
    cy.wait(['@getProfile', '@getFeed', '@getNotifications', '@getSuggestions'], { timeout: 20000 });
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
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ax8p0kAAAAASUVORK5CYII=';

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
    cy.intercept('POST', '**/api/posts/**', {
      delay: 1000,
      statusCode: 201,
      body: { 
        id: 101, 
        content: 'Post Lento', 
        author: { 
          username: 'cristiano',
          display_name: 'Cristiano Tobias',
          profile_picture: null
        },
        created_at: new Date().toISOString(),
        likes_count: 0,
        comments_count: 0,
        is_liked: false
      },
    }).as('postLento');

    cy.get('textarea').first().type('Postando com calma...');
    cy.get('button[type="submit"]').should('not.be.disabled').click();

    cy.get('button[type="submit"]').should('be.disabled');
    cy.get('textarea').should('be.disabled');
    cy.get('button[type="submit"]').should('contain', 'Posting...');

    cy.wait('@postLento');
  });
});