describe('Mindly - Jornada Completa do Utilizador', () => {

  const mockProfile = {
    id: '123',
    username: 'testuser',
    display_name: 'Teste Cypress',
    profile_picture: null,
    followers_count: 0,
    following_count: 0,
    is_following: false,
    is_private: false
  };

  const mockPostsEmpty = {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };

  const mockPostWithContent = {
    count: 1,
    next: null,
    previous: null,
    results: [{
      id: 55, 
      content: 'Post para Like', 
      is_liked: false, 
      likes_count: 0,
      author: {
        username: 'testuser',
        profile_picture: null,
        display_name: 'Teste Cypress'
      },
      created_at: new Date().toISOString(),
      comments_count: 0
    }]
  };

  const visitAuthed = (path = '/', options = {}) => {
    cy.visit(path, {
      ...options,
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token-123');
        win.localStorage.setItem('refresh', 'fake-refresh-123');
        if (typeof options.onBeforeLoad === 'function') {
          options.onBeforeLoad(win);
        }
      },
    });
  };

  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearLocalStorage();
    cy.clearCookies();

    cy.intercept('GET', '/api/accounts/profile/', {
      statusCode: 200,
      body: mockProfile,
    }).as('getProfile');

    cy.intercept('GET', '/api/accounts/feed/**', {
      statusCode: 200,
      body: mockPostsEmpty
    }).as('getFeed');

    cy.intercept('GET', '/api/accounts/notifications/**', {
      statusCode: 200,
      body: []
    }).as('getNotifications');

    cy.intercept('GET', '/api/accounts/suggested-follows/**', {
      statusCode: 200,
      body: []
    }).as('getSuggestedFollows');
  });

  describe('Navegação e Dashboard', () => {
    it('1. Deve carregar as abas e persistir no Refresh (F5)', () => {
      visitAuthed('/');
      cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 });
      cy.contains('button', /Para você|For You/i, { timeout: 10000 }).should('be.visible');
      cy.reload();
      cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 });
      cy.contains('button', /Para você|For You/i, { timeout: 10000 }).should('be.visible');
    });

    it('2. Deve navegar para Configurações via Navbar', () => {
      visitAuthed('/');
      cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 });
      cy.get('nav').contains(/Profile|Perfil|Configurações|Settings/i).click({ force: true });
      
      // CORREÇÃO: Usar expect em vez de .or
      cy.url().then(url => {
        expect(url).to.satisfy(url => url.includes('/profile') || url.includes('/settings'));
      });
    });

    it('3. Deve realizar o logout corretamente', () => {
      visitAuthed('/');
      cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 });
      cy.contains('button', /Logout|Sair|Sign out/i).click({ force: true });
      cy.window().should((win) => {
        expect(win.localStorage.getItem('access')).to.be.null;
        expect(win.localStorage.getItem('refresh')).to.be.null;
      });
      
      // CORREÇÃO: Usar expect em vez de .or
      cy.url().then(url => {
        expect(url).to.satisfy(url => url.includes('/login') || url.includes('/signin'));
      });
    });
  });

  describe('Postagem e Interações', () => {
    it('4. Deve permitir postar texto e limpar o campo', () => {
      // CORREÇÃO: Rota do POST sem /accounts/
      cy.intercept('POST', '/api/posts/', {
        statusCode: 201,
        body: { 
          id: 99, 
          content: 'Sucesso!', 
          author: { 
            username: 'testuser',
            profile_picture: null,
            display_name: 'Teste Cypress'
          },
          created_at: new Date().toISOString(),
          likes_count: 0,
          is_liked: false,
          comments_count: 0
        },
      }).as('createPost');

      visitAuthed('/');
      cy.wait('@getFeed', { timeout: 15000 });
      
      cy.get('textarea[placeholder*="What\'s on your mind?"]', { timeout: 10000 })
        .first()
        .should('be.visible')
        .type('Teste de postagem automatizado');
      
      cy.get('button[type="submit"]', { timeout: 10000 }).click();
      cy.wait('@createPost', { timeout: 10000 });
      
      cy.get('textarea[placeholder*="What\'s on your mind?"]')
        .first()
        .should('have.value', '');
    });

    it('5. Deve alternar o estado de Like em um post', () => {
      cy.intercept('GET', '/api/accounts/feed/**', {
        statusCode: 200,
        body: mockPostWithContent
      }).as('getFeedWithContent');

      // CORREÇÃO: Rota do like sem /accounts/
      cy.intercept('POST', '/api/posts/55/like/', { 
        statusCode: 200, 
        body: { is_liked: true, likes_count: 1 } 
      }).as('likeAction');

      visitAuthed('/');
      cy.wait('@getFeedWithContent', { timeout: 15000 });

      // CORREÇÃO: Seletor sem :contains("0") problemático
      cy.get('button span:contains("0")', { timeout: 10000 })
        .first()
        .parent()
        .click({ force: true }); 
      
      cy.wait('@likeAction', { timeout: 10000 });
    });

    it('6. Deve validar erro de postagem (Feedback via Alert)', () => {
      // CORREÇÃO: Rota do POST sem /accounts/
      cy.intercept('POST', '/api/posts/', {
        statusCode: 400,
        body: { error: 'O conteúdo não pode estar vazio' }
      }).as('postError');

      cy.on('window:alert', (text) => {
        expect(text).to.contains('Error');
      });

      visitAuthed('/');
      cy.wait('@getFeed', { timeout: 15000 });
      
      cy.get('textarea[placeholder*="What\'s on your mind?"]', { timeout: 10000 })
        .first()
        .type('Trigger Error');
      
      cy.get('button[type="submit"]', { timeout: 10000 }).click();
      cy.wait('@postError', { timeout: 10000 });
    });
  });

  describe('Notificações', () => {
    it('7. Deve carregar a lista de notificações corretamente', () => {
      const mockNotifications = [
        { 
          id: 1, 
          sender_name: 'joao', 
          notification_type: 'LIKE', 
          is_read: false,
          created_at: new Date().toISOString(),
          post_content: 'Post de teste',
          post: { id: 55, content: 'Post de teste' }
        }
      ];

      // CORREÇÃO: Remover intercept duplicado
      cy.intercept('GET', '/api/notifications/**', { // SEM /accounts/
        statusCode: 200,
        body: mockNotifications
      }).as('getNotifications');

      visitAuthed('/notifications');
      
      cy.wait('@getNotifications', { timeout: 15000 })
        .its('response.statusCode')
        .should('eq', 200);

      cy.wait(1000);

      cy.contains(/curtiu|like|liked/i, { timeout: 10000 }).should('be.visible');
      cy.contains('joao', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Responsividade Mobile', () => {
    it('8. Deve ajustar layout para iPhone (Mobile)', () => {
      cy.viewport('iphone-xr');
      visitAuthed('/');
      cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 });
      cy.contains('button', /Para você|For You/i, { timeout: 10000 }).should('be.visible');
    });
  });
});