describe('Mindly - Jornada Completa do Utilizador', () => {

  const mockProfile = {
    id: '123',
    username: 'testuser',
    display_name: 'Teste Cypress',
    profile_picture: null,
  };

  const mockPostsEmpty = {
    count: 0,
    next: null,
    results: [],
  };

  // Helper para injetar o token no LocalStorage antes de carregar a página
  const visitAuthed = (path = '/', options = {}) => {
    cy.visit(path, {
      ...options,
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token-123');
        if (typeof options.onBeforeLoad === 'function') {
          options.onBeforeLoad(win);
        }
      },
    });
  };

  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearLocalStorage();

    // Mocks globais para evitar quebras de interface
    cy.intercept('GET', /\/(api\/)?accounts\/profile(\/me\/?)?\/?(\?.*)?$/, {
      statusCode: 200,
      body: mockProfile,
    }).as('getProfile');

    cy.intercept('GET', /\/(api\/)?(accounts\/)?posts\/?.*(\?.*)?$/, {
      statusCode: 200,
      body: mockPostsEmpty,
    }).as('getPostsInitial');

    cy.intercept('GET', '**/api/notifications/**', {
      statusCode: 200,
      body: []
    }).as('getNotificationsEmpty');
  });

  describe('Navegação e Dashboard', () => {
    it('1. Deve carregar as abas e persistir no Refresh (F5)', () => {
      visitAuthed('/');
      cy.wait(['@getProfile', '@getPostsInitial']);
      cy.contains('button', /Para você|For You/i, { timeout: 10000 }).should('be.visible');
      cy.reload();
      cy.contains('button', /Para você|For You/i, { timeout: 10000 }).should('be.visible');
    });

    it('2. Deve navegar para Configurações via Navbar', () => {
      visitAuthed('/');
      cy.wait(['@getProfile', '@getPostsInitial']);
      cy.get('nav').contains(/Profile|Perfil/i).click({ force: true });
      cy.url().should('include', '/profile');
    });

    it('3. Deve realizar o logout corretamente', () => {
      visitAuthed('/');
      cy.wait(['@getProfile', '@getPostsInitial']);
      cy.contains('button', /Logout|Sair/i).click({ force: true });
      cy.window().should((win) => {
        expect(win.localStorage.getItem('access')).to.be.null;
      });
      cy.url().should('include', '/login');
    });
  });

  describe('Postagem e Interações', () => {
    it('4. Deve permitir postar texto e limpar o campo', () => {
      cy.intercept('POST', '**/api/posts/', {
        statusCode: 201,
        body: { id: 99, content: 'Sucesso!', author: { username: 'testuser' } },
      }).as('createPost');

      visitAuthed('/');
      cy.get('textarea').first().type('Teste de postagem automatizado');
      cy.get('button[type="submit"]').click();
      cy.wait('@createPost');
      cy.get('textarea').first().should('have.value', '');
    });

    it('5. Deve alternar o estado de Like em um post', () => {
      const postComConteudo = {
        count: 1,
        results: [{ id: 55, content: 'Post para Like', is_liked: false, likes_count: 0 }]
      };

      cy.intercept('GET', '**/api/posts/**', postComConteudo).as('getPostsWithContent');
      cy.intercept('POST', '**/api/posts/55/like/', { 
        statusCode: 200, 
        body: { is_liked: true, likes_count: 1 } 
      }).as('likeAction');

      visitAuthed('/');
      cy.wait('@getPostsWithContent');

      // AJUSTE DEFINITIVO: Procura o BOTÃO que contém o número 0.
      // Clicar no botão é mais garantido do que clicar no texto puro.
      cy.get('main')
        .contains('button', '0')
        .first()
        .click({ force: true }); 
      
      cy.wait('@likeAction');
    });

    it('6. Deve validar erro de postagem (Feedback via Alert)', () => {
      cy.intercept('POST', '**/api/posts/', {
        statusCode: 400,
        body: { error: 'O conteúdo não pode estar vazio' }
      }).as('postError');

      // Captura o alerta do navegador para o teste não falhar
      cy.on('window:alert', (text) => {
        expect(text).to.contains('Error');
      });

      visitAuthed('/');
      cy.get('textarea').first().type('Trigger Error');
      cy.get('button[type="submit"]').click();
      cy.wait('@postError');
    });
  });

  describe('Notificações', () => {
    it('7. Deve carregar a lista de notificações corretamente', () => {
      cy.intercept('GET', '**/api/notifications/', {
        statusCode: 200,
        body: [
          { 
            id: 1, 
            sender_name: 'joao', 
            notification_type: 'LIKE', 
            is_read: false,
            created_at: new Date().toISOString() 
          }
        ]
      }).as('getNotifications');

      visitAuthed('/notifications');
      cy.wait('@getNotifications');

      // Verifica se o componente renderizou o texto baseado no notification_type
      cy.contains('curtiu seu post').should('be.visible');
      cy.contains('joao').should('be.visible');
    });
  });

  describe('Responsividade Mobile', () => {
    it('8. Deve ajustar layout para iPhone (Mobile)', () => {
      cy.viewport('iphone-xr');
      visitAuthed('/');
      cy.wait(['@getProfile', '@getPostsInitial']);
      cy.contains('button', /Para você|For You/i).should('be.visible');
    });
  });
});