describe('Flow: Post Creation with Synthetic Media', () => {
  const base64Image =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

  beforeEach(() => {
    cy.intercept('POST', '**/api/token/refresh/**', {
      statusCode: 200,
      body: { access: 'fake-access', refresh: 'fake-refresh' },
    }).as('refreshToken');

    // ✅ Usando wildcards duplos para garantir que o alias seja aplicado
    cy.intercept('GET', '**/api/notifications/**', {
      statusCode: 200,
      body: { results: [] },
    }).as('getNotifications');
    cy.intercept('GET', '**/api/accounts/suggested-follows/**', {
      statusCode: 200,
      body: { results: [] },
    }).as('getSuggestions');

    cy.login({ username: 'testuser' });

    globalThis.postCreated = false;
    globalThis.videoCreated = false;
  });

  it('should create a post with a synthetic image file', () => {
    const content = 'Synthetic Image Test ' + Date.now();

    cy.intercept('GET', '**/api/accounts/feed/**', (req) => {
      if (globalThis.postCreated) {
        req.reply({
          statusCode: 200,
          body: {
            count: 1,
            results: [
              {
                id: 123,
                content: content,
                media_url: base64Image,
                author: { username: 'testuser', display_name: 'Test User' },
                created_at: new Date().toISOString(),
                moderation_status: 'APPROVED',
              },
            ],
          },
        });
      } else {
        req.reply({ statusCode: 200, body: { count: 0, results: [] } });
      }
    }).as('getFeed');

    cy.intercept('POST', '**/api/posts/**', {
      statusCode: 201,
      body: {
        id: 123,
        content: content,
        media_url: base64Image,
        author: { username: 'testuser' },
      },
    }).as('postRequest');

    cy.visit('/');

    // ✅ O SEGREDO: Esperamos apenas o Feed. Notificações não impedem o post.
    cy.wait('@getFeed', { timeout: 15000 });

    cy.get('textarea[placeholder*="mind"]').first().type(content);

    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
          'base64'
        ),
        fileName: 'synthetic-test.png',
        mimeType: 'image/png',
      },
      { force: true }
    );

    cy.get('button[type="submit"]').click();
    cy.wait('@postRequest');

    globalThis.postCreated = true;
    cy.reload();
    cy.wait('@getFeed');

    cy.contains(content).should('be.visible');
    cy.get('img[alt="Post media"]', { timeout: 10000 }).should('be.visible');
  });

  it('should create a post with a synthetic video file', () => {
    const content = 'Synthetic Video Test ' + Date.now();
    const videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';

    cy.intercept('GET', '**/api/accounts/feed/**', (req) => {
      if (globalThis.videoCreated) {
        req.reply({
          statusCode: 200,
          body: {
            count: 1,
            results: [
              {
                id: 456,
                content: content,
                media_url: videoUrl,
                author: { username: 'testuser' },
                created_at: new Date().toISOString(),
                moderation_status: 'APPROVED',
              },
            ],
          },
        });
      } else {
        req.reply({ statusCode: 200, body: { count: 0, results: [] } });
      }
    }).as('getFeedVideo');

    cy.intercept('POST', '**/api/posts/**', {
      statusCode: 201,
      body: {
        id: 456,
        content: content,
        media_url: videoUrl,
        author: { username: 'testuser' },
      },
    }).as('videoPostRequest');

    cy.visit('/');
    cy.wait('@getFeedVideo', { timeout: 15000 });

    cy.get('textarea[placeholder*="mind"]').first().type(content);

    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from('fake-video-data'),
        fileName: 'test-video.mp4',
        mimeType: 'video/mp4',
      },
      { force: true }
    );

    cy.get('button[type="submit"]').click();
    cy.wait('@videoPostRequest');

    globalThis.videoCreated = true;
    cy.reload();
    cy.wait('@getFeedVideo');

    cy.get('video', { timeout: 10000 }).should('be.visible');
    cy.contains(content).should('be.visible');
  });
});
