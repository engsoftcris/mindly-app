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

  // Helper: garante token ANTES do app carregar (mais estável que cy.window() depois)
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

    // ✅ Intercept robusto para perfil:
    // cobre:
    // - /api/accounts/profile/
    // - /accounts/profile/
    // - /api/accounts/profile/me/
    // - /api/.../profiles/me/ (se você mudar pra /profiles/me/)
    cy.intercept(
      'GET',
      /\/(api\/)?accounts\/profile(\/me\/?)?\/?(\?.*)?$/,
      {
        statusCode: 200,
        body: mockProfile,
      }
    ).as('getProfile');

    // ✅ Posts: cobre /api/posts/, /posts/, /api/accounts/posts/ etc.
    cy.intercept(
      'GET',
      /\/(api\/)?(accounts\/)?posts\/?.*(\?.*)?$/,
      {
        statusCode: 200,
        body: mockPostsEmpty,
      }
    ).as('getPostsInitial');
  });

  describe('Navegação e Dashboard', () => {
    it('1. Deve carregar as abas e persistir no Refresh (F5)', () => {
      visitAuthed('/');

      cy.wait(['@getProfile', '@getPostsInitial']);

      cy.contains('button', 'Para você', { timeout: 10000 }).should('be.visible');

      cy.reload();

      // Após reload, o app pode refazer chamadas.
      // Se ele não refizer alguma delas, o teste não deve quebrar por isso.
      // Então, aguardamos que pelo menos o UI volte.
      cy.contains('button', 'Para você', { timeout: 10000 }).should('be.visible');
      cy.url().should('not.include', '/login');
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

  describe('Postagem e Media', () => {
    it('4. Deve permitir postar texto e limpar o campo', () => {
      // ✅ Intercept robusto para criação de post
      cy.intercept(
        'POST',
        /\/(api\/)?(accounts\/)?posts\/?$/,
        {
          statusCode: 201,
          body: { id: 99, content: 'Sucesso!', author: { username: 'testuser' } },
        }
      ).as('createPost');

      visitAuthed('/');

      cy.wait(['@getProfile', '@getPostsInitial']);

      cy.get('textarea', { timeout: 15000 }).should('be.visible').and('not.be.disabled');

      cy.get('textarea').first().type('Teste final de fluxo', { delay: 30 });

      cy.get('button[type="submit"]').should('not.be.disabled').click();

      cy.wait('@createPost');
      cy.get('textarea').first().should('have.value', '');
    });
  });

  describe('Responsividade Mobile', () => {
    it('5. Deve ajustar layout para iPhone (Mobile)', () => {
      cy.viewport('iphone-xr');

      visitAuthed('/');

      cy.wait(['@getProfile', '@getPostsInitial']);

      cy.contains('button', /Para você|For You/i, { timeout: 10000 }).should('be.visible');
    });
  });
});
