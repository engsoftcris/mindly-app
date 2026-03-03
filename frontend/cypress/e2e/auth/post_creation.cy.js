describe('Flow: Post Creation with Synthetic Media', () => {
  beforeEach(() => {
    cy.login({ username: 'testuser', seedFeed: false }); 
  });

  it('should create a post with a synthetic image file', () => {
    const content = 'Synthetic Image Test ' + Date.now();
    
    // INTERCEPT ÚNICO para o feed
    cy.intercept('GET', '**/api/accounts/feed/**', (req) => {
      if (globalThis.postCreated) {
        req.reply({
          statusCode: 200,
          body: {
            count: 1,
            results: [{
              id: 123,
              content: content,
              media_url: 'https://via.placeholder.com/150',
              author: {
                username: 'testuser',
                display_name: 'Test User'
              },
              created_at: new Date().toISOString(),
              likes_count: 0,
              comments_count: 0
            }]
          }
        });
      } else {
        req.reply({
          statusCode: 200,
          body: {
            count: 0,
            results: []
          }
        });
      }
    }).as('getFeed');

    // CORREÇÃO: Rota do POST sem /accounts/ (igual ao que o frontend chama)
    cy.intercept('POST', '**/api/posts/**', {
      statusCode: 201,
      body: {
        id: 123,
        content: content,
        media_url: 'https://via.placeholder.com/150',
        author: {
          username: 'testuser',
          display_name: 'Test User',
          profile_picture: null
        },
        created_at: new Date().toISOString(),
        likes_count: 0,
        comments_count: 0,
        moderation_status: 'APPROVED'
      }
    }).as('postRequest');

    cy.visit('/');
    
    globalThis.postCreated = false;
    
    cy.wait('@getFeed', { timeout: 10000 });
    
    cy.get('textarea[placeholder*="What\'s on your mind?"]', { timeout: 10000 })
      .first()
      .should('be.visible')
      .type(content);

    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64'),
      fileName: 'synthetic-test.png',
      mimeType: 'image/png',
      lastModified: Date.now()
    }, { force: true });

    cy.get('button[type="submit"]', { timeout: 10000 })
      .should('not.be.disabled')
      .click();

    // AGORA deve funcionar porque a rota está correta
    cy.wait('@postRequest', { timeout: 10000 });
    
    globalThis.postCreated = true;
    
    cy.reload();
    cy.wait('@getFeed', { timeout: 10000 });

    cy.contains(content, { timeout: 10000 }).should('be.visible');
    cy.get('img[alt="Post media"]', { timeout: 10000 }).should('be.visible');
  });

  it('should create a post with a synthetic video file', () => {
    const content = 'Synthetic Video Test ' + Date.now();
    
    cy.intercept('GET', '**/api/accounts/feed/**', (req) => {
      if (globalThis.videoCreated) {
        req.reply({
          statusCode: 200,
          body: {
            count: 1,
            results: [{
              id: 456,
              content: content,
              media_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
              author: { 
                username: 'testuser', 
                display_name: 'Test User' 
              },
              created_at: new Date().toISOString(),
              likes_count: 0,
              comments_count: 0
            }]
          }
        });
      } else {
        req.reply({
          statusCode: 200,
          body: {
            count: 0,
            results: []
          }
        });
      }
    }).as('getFeed');

    // CORREÇÃO: Rota do POST sem /accounts/
    cy.intercept('POST', '**/api/posts/**', {
      statusCode: 201,
      body: {
        id: 456,
        content: content,
        media_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        author: { 
          username: 'testuser', 
          display_name: 'Test User',
          profile_picture: null
        },
        created_at: new Date().toISOString(),
        likes_count: 0,
        comments_count: 0,
        moderation_status: 'APPROVED'
      }
    }).as('videoPostRequest');

    cy.visit('/');
    
    globalThis.videoCreated = false;
    
    cy.wait('@getFeed', { timeout: 10000 });

    cy.get('textarea[placeholder*="What\'s on your mind?"]', { timeout: 10000 })
      .first()
      .type(content);

    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('fake-video-data'),
      fileName: 'test-video.mp4',
      mimeType: 'video/mp4',
      lastModified: Date.now()
    }, { force: true });

    cy.get('button[type="submit"]', { timeout: 10000 })
      .should('be.visible')
      .and('not.be.disabled')
      .click();

    cy.wait('@videoPostRequest', { timeout: 10000 });
    
    globalThis.videoCreated = true;
    
    cy.reload();
    cy.wait('@getFeed', { timeout: 10000 });

    cy.get('video', { timeout: 10000 }).should('be.visible');
    cy.contains(content).should('be.visible');
  });
});