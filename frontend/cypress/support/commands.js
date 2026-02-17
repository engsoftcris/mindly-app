// cypress/support/commands.js

Cypress.Commands.add('login', (options = {}) => {
  const {
    username = 'testuser',
    userId = 1,
    path = '/dashboard',
    // se você quiser garantir que sempre tem um post renderizado para testes
    seedFeed = true,
    initialLikes = 10,
  } = options;

  const user = { id: userId, username };
  const basePost = { id: 99, content: 'Post de Teste', user };

  const setAuthStorage = (win) => {
    const u = JSON.stringify(user);

    // ajuste aqui para o padrão do seu app (mas deixe redundância, não atrapalha)
    win.localStorage.setItem('user', u);
    win.localStorage.setItem('accessToken', 'token-fake-valido');
    win.localStorage.setItem('refreshToken', 'refresh-fake-valido');

    // compatibilidade extra (caso algum trecho do app leia outras keys)
    win.localStorage.setItem('token', 'token-fake-valido');
    win.localStorage.setItem('access', 'token-fake-valido');
    win.localStorage.setItem('refresh', 'refresh-fake-valido');

    // se em algum ponto usar sessionStorage
    win.sessionStorage.setItem('user', u);
    win.sessionStorage.setItem('accessToken', 'token-fake-valido');
  };

  // Alias únicos e patterns “largos” (evita o problema do wait não achar a rota)
  const registerDefaultIntercepts = () => {
    cy.intercept('GET', '**/api/accounts/profile*', {
      statusCode: 200,
      body: user,
    }).as('getProfile');

    if (seedFeed) {
      cy.intercept('GET', '**/api/posts*', {
        statusCode: 200,
        body: [{ ...basePost, likes_count: initialLikes, is_liked: false }],
      }).as('getFeed');
    }
  };

  // Reaproveita a sessão em TODOS os testes (e pode reutilizar entre specs)
  cy.session(
    `login:${username}`,
    () => {
      registerDefaultIntercepts();

      cy.visit(path, { onBeforeLoad: setAuthStorage });

      // garante que não caiu no /login
      cy.location('pathname', { timeout: 20000 }).should('not.include', '/login');

      // espera o básico do app carregar (se seedFeed estiver ativo)
      cy.wait('@getProfile', { timeout: 20000 });
      if (seedFeed) cy.wait('@getFeed', { timeout: 20000 });
    },
    {
      cacheAcrossSpecs: true,
      validate() {
        // valida rapidamente se "continua logado"
        cy.window().then((win) => {
          const token = win.localStorage.getItem('accessToken') || win.localStorage.getItem('token');
          expect(token, 'token presente').to.be.a('string').and.not.be.empty;
        });
      },
    }
  );

  // Depois da session criada/restaurada, volta para a rota do teste com auth já presente
  registerDefaultIntercepts();
  cy.visit(path, { onBeforeLoad: setAuthStorage });
});
