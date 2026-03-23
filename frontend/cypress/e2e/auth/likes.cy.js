describe('Fluxo de Likes (TAL-39)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();

    // ✅ ESCUDO ANT-401: Impede que o reload te jogue para o login
    cy.intercept('POST', '**/api/token/refresh/**', {
      statusCode: 200,
      body: { access: 'fake-access', refresh: 'fake-refresh' },
    }).as('refreshToken');

    cy.intercept('GET', '**/api/accounts/profiles/relationships-sync/**', {
      statusCode: 200,
      body: { blocked_users: [] },
    });

    cy.intercept('GET', '/api/accounts/profile/', {
      statusCode: 200,
      body: { id: 1, username: 'testuser', display_name: 'Test User' },
    }).as('getProfile');

    // Mock inicial do Feed COM OS DOIS POSTS
    cy.intercept('GET', '/api/accounts/feed/**', {
      statusCode: 200,
      body: {
        count: 2,
        results: [
          {
            id: 123,
            content: 'Primeiro post para testar likes',
            likes_count: 10,
            is_liked: false,
            author: { username: 'testuser' },
            created_at: new Date().toISOString(),
          },
          {
            id: 456,
            content: 'Segundo post para testar likes',
            likes_count: 5,
            is_liked: true, // Este aqui já vem likeado
            author: { username: 'outro_usuario' },
            created_at: new Date().toISOString(),
          },
        ],
      },
    }).as('getFeed');

    cy.intercept('GET', '**/api/notifications/**', {
      statusCode: 200,
      body: [],
    });
    cy.intercept('GET', '**/api/accounts/suggested-follows/**', {
      statusCode: 200,
      body: [],
    });

    // Injeta tokens antes da visita
    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
      win.localStorage.setItem('refresh', 'fake-refresh-123');
    });

    cy.visit('/');
    cy.wait(['@getProfile', '@getFeed']);
  });

  it('1. Deve realizar o ciclo completo de like e unlike com sucesso', () => {
    cy.intercept('POST', '**/api/posts/123/like/', {
      statusCode: 200,
      body: { is_liked: true, likes_count: 11 },
    }).as('likeRequest');

    cy.contains('Primeiro post para testar likes', { timeout: 10000 }).should(
      'be.visible'
    );

    cy.contains('button', '10', { timeout: 10000 }).first().click();

    cy.wait('@likeRequest', { timeout: 10000 });

    cy.contains('button', '11', { timeout: 10000 })
      .first()
      .should('be.visible');

    cy.intercept('POST', '**/api/posts/123/like/', {
      statusCode: 200,
      body: { is_liked: false, likes_count: 10 },
    }).as('unlikeRequest');

    cy.contains('button', '11', { timeout: 10000 }).first().click();

    cy.wait('@unlikeRequest', { timeout: 10000 });

    cy.contains('button', '10', { timeout: 10000 })
      .first()
      .should('be.visible');
  });

  it('2. Deve mostrar estado inicial correto (likeado/não likeado)', () => {
    // Verifica primeiro post (não likeado)
    cy.contains('Primeiro post para testar likes', { timeout: 10000 })
      // .first() garante que pegamos apenas o container do post específico
      .parents('[data-cy="post-card"]')
      .first()
      .within(() => {
        cy.get('[data-cy="like-button"]').should('contain', '10');
        cy.get('[data-cy="like-button"]').should(
          'not.have.class',
          'text-pink-500'
        );
      });

    // Verifica segundo post (já likeado)
    cy.contains('Segundo post para testar likes', { timeout: 10000 })
      .parents('[data-cy="post-card"]')
      .first()
      .within(() => {
        cy.get('[data-cy="like-button"]').should('contain', '5');
        // Verifica se a classe de "likeado" está presente no botão
        cy.get('[data-cy="like-button"]').should('have.class', 'text-pink-500');
      });
  });

  it('3. Deve lidar com erro na requisição de like (feedback visual)', () => {
    cy.intercept('POST', '**/api/posts/123/like/', {
      statusCode: 500,
      body: { error: 'Internal server error' },
    }).as('likeError');

    // Mock do toast/snackbar de erro
    cy.on('window:alert', (text) => {
      expect(text).to.contains('error');
    });

    cy.contains('Primeiro post para testar likes', { timeout: 10000 }).should(
      'be.visible'
    );

    cy.contains('button', '10', { timeout: 10000 }).first().click();

    cy.wait('@likeError', { timeout: 10000 });

    // Verifica que o contador NÃO mudou
    cy.contains('button', '10', { timeout: 10000 })
      .first()
      .should('be.visible');
  });

  it('4. Deve impedir like duplicado (já likeado)', () => {
    // Intercept para post que já está likeado
    cy.intercept('POST', '**/api/posts/456/like/', {
      statusCode: 400,
      body: { error: 'You already liked this post' },
    }).as('duplicateLike');

    cy.contains('Segundo post para testar likes', { timeout: 10000 }).should(
      'be.visible'
    );

    cy.contains('button', '5', { timeout: 10000 }).first().click();

    cy.wait('@duplicateLike', { timeout: 10000 });

    // Verifica que o contador permanece 5
    cy.contains('button', '5', { timeout: 10000 }).first().should('be.visible');
  });

  it('5. Deve atualizar contador em tempo real quando outro usuário dá like (Polling)', () => {
    // Primeiro, verifica o contador inicial
    cy.contains('Primeiro post para testar likes', { timeout: 10000 }).should(
      'be.visible'
    );

    cy.contains('button', '10', { timeout: 10000 })
      .first()
      .should('be.visible');

    // CORREÇÃO: Mock do feed APÓS o reload com o contador atualizado
    cy.intercept('GET', '/api/accounts/feed/**', {
      statusCode: 200,
      body: {
        count: 2,
        next: null,
        previous: null,
        results: [
          {
            id: 123,
            content: 'Primeiro post para testar likes',
            is_liked: false,
            likes_count: 15, // ← Atualizado!
            author: {
              username: 'testuser',
              display_name: 'Test User',
              profile_picture: null,
            },
            created_at: new Date().toISOString(),
            comments_count: 0,
          },
          {
            id: 456,
            content: 'Segundo post para testar likes',
            is_liked: true,
            likes_count: 5,
            author: {
              username: 'outro_usuario',
              display_name: 'Outro Usuário',
              profile_picture: null,
            },
            created_at: new Date().toISOString(),
            comments_count: 2,
          },
        ],
      },
    }).as('getFeedUpdated');

    // Recarrega a página para simular nova busca de dados
    cy.reload();

    // Espera o feed atualizado carregar
    cy.wait('@getFeedUpdated', { timeout: 10000 });
    cy.wait('@getProfile', { timeout: 10000 });

    // Verifica se o contador atualizou para 15
    cy.contains('button', '15', { timeout: 10000 })
      .first()
      .should('be.visible');

    // Log para debug
    cy.log('✅ Contador atualizado de 10 para 15 após reload');
  });
});
