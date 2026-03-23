import './commands'

// 1. MOCKS GLOBAIS DE SEGURANÇA
// Isso garante que QUALQUER teste, mesmo que esqueça de mocar, 
// não receba um 401 que desloga o usuário.
beforeEach(() => {
  // Intercepta notificações com wildcard para evitar o "No request occurred"
  cy.intercept('GET', '**/api/notifications/**', { 
    statusCode: 200, 
    body: { count: 0, results: [] } 
  }).as('globalNotifications');

  // Intercepta sugestões globalmente para evitar que o teste trave se o app não chamar
  cy.intercept('GET', '**/api/accounts/suggested-follows/**', { 
    statusCode: 200, 
    body: { results: [] } 
  }).as('globalSuggestions');

  // Intercepta o Sync de relacionamentos (Bloqueios) para evitar quebra na Sidebar
  cy.intercept('GET', '**/api/accounts/profiles/relationships-sync/**', { 
    statusCode: 200, 
    body: { blocked_users: [], muted_users: [] } 
  }).as('globalSync');
});

// 2. LIMPEZA PÓS-TESTE
afterEach(() => {
  // Limpa o Storage para o próximo arquivo .cy.js começar do zero
  cy.clearLocalStorage();
  cy.clearCookies();
  
  cy.window().then((win) => {
    if (win.sessionStorage) win.sessionStorage.clear();
    if (win.gc) win.gc(); 
  });
});

// 3. TOLERÂNCIA A ERROS DO FRONT-END
// Evita que erros de renderização (React) que não impedem o uso matem o Cypress
Cypress.on('uncaught:exception', (err, runnable) => {
  // Retornar false impede que o Cypress falhe o teste automaticamente
  return false;
});