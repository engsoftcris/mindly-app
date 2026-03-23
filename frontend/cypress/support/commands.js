// cypress/support/commands.js

// cypress/support/commands.js

Cypress.Commands.add('login', (options = {}) => {
  const {
    username = 'testuser',
    userId = 'b369ce73-66ba-4dc9-a736-d79eb3e45e5b',
    path = '/'
  } = options;

  const user = { id: userId, username, display_name: 'Test User' };

  // ✅ 1. PREPARAÇÃO DOS MOCKS (O ESCUDO)
  // Definimos os mocks ANTES de visitar a página
  cy.intercept('GET', '**/api/accounts/profile/**', { statusCode: 200, body: user }).as('getProfile');
  cy.intercept('POST', '**/api/token/refresh/**', {
    statusCode: 200,
    body: { access: 'fake-access-123', refresh: 'fake-refresh-123' }
  }).as('refreshToken');
  
  // Mocks de sidebars para evitar 401 que disparam o refresh do axios.js
  cy.intercept('GET', '**/api/notifications/**', { statusCode: 200, body: { results: [] } });
  cy.intercept('GET', '**/api/accounts/suggested-follows/**', { statusCode: 200, body: { results: [] } });
  cy.intercept('GET', '**/api/accounts/profiles/relationships-sync/**', { statusCode: 200, body: { blocked_users: [] } });

  // ✅ 2. INJEÇÃO DE STORAGE E VISITA
  // Usamos o onBeforeLoad para garantir que o axios.js já leia os tokens ao carregar
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('access', 'fake-access-123');
      win.localStorage.setItem('refresh', 'fake-refresh-123');
      win.localStorage.setItem('user', JSON.stringify(user));
    }
  });

  // ✅ 3. ESTABILIZAÇÃO
  // Garante que o perfil carregou antes de entregar o controle para o teste
  cy.wait('@getProfile');
});

/**
 * Visita uma página já injetando o token de acesso.
 * Adicionamos o intercept do refresh para evitar que o axios.js 
 * deslogue o usuário se tentar renovar o token durante o carregamento.
 */
Cypress.Commands.add('visitAuthed', (path = '/', token = 'fake-token-123') => {
  // ✅ ESCUDO: Garante que qualquer tentativa de refresh dê 200 enquanto visita
  cy.intercept('POST', '**/api/token/refresh/**', {
    statusCode: 200,
    body: { access: token, refresh: 'fake-refresh-123' }
  }).as('visitRefresh');

  cy.visit(path, {
    onBeforeLoad(win) {
      // Usando 'access' para bater com o localStorage.getItem('access') do seu axios.js
      win.localStorage.setItem('access', token);
      win.localStorage.setItem('refresh', 'fake-refresh-123');
    },
  });
});

// --- COMANDOS PARA ESTABILIZAÇÃO (DoD) ---

/**
 * Seletor universal para data-cy.
 * Uso: cy.getByData('login-button').click()
 */
Cypress.Commands.add('getByData', (selector, ...args) => {
  return cy.get(`[data-cy="${selector}"]`, ...args);
});

/**
 * Comando para garantir que um elemento está estável e visível.
 * Adicionada uma verificação de "não estar desabilitado" para cliques seguros.
 */
Cypress.Commands.add('waitForStable', (selector, timeout = 5000) => {
  cy.get(`[data-cy="${selector}"]`, { timeout })
    .should('be.visible')
    .and('not.be.disabled');
});

/**
 * Atalho para interceptar as rotas que sempre dão 401 e quebram o layout
 */
Cypress.Commands.add('interceptSidebars', () => {
  cy.intercept('GET', '**/api/accounts/suggested-follows/**', { statusCode: 200, body: { results: [] } });
  cy.intercept('GET', '**/api/accounts/profiles/relationships-sync/**', { statusCode: 200, body: { blocked_users: [] } });
  cy.intercept('GET', '**/api/notifications/**', { statusCode: 200, body: { results: [] } });
});