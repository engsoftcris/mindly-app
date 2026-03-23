describe('Fluxo de Autenticação e Loading - Mindly', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('1. Deve mostrar a tela de Loading (1.5s) e transicionar para o Dashboard com sucesso', () => {
    const MIN_DELAY = 1500;

    cy.intercept('GET', '**/accounts/profile/', {
      delay: MIN_DELAY,
      statusCode: 200,
      body: {
        id: 1,
        username: 'cristiano',
        display_name: 'Cristiano',
        email: 'cris@test.com',
      },
    }).as('getUserProfile');

    cy.intercept('GET', '**/posts/', {
      statusCode: 200,
      body: { results: [], next: null },
    }).as('getPosts');

    cy.intercept('GET', '**/notifications/', {
      statusCode: 200,
      body: [],
    }).as('getNotifications');

    localStorage.setItem('access', 'fake-token-valido');
    cy.visit('/');

    // --- ESTADO 1: LOADING (Usa os data-cy da nossa LoadingScreen) ---
    cy.getByData('loading-brand').should('contain', 'Mindly').and('be.visible');
    cy.getByData('loading-spinner')
      .should('be.visible')
      .and('have.class', 'animate-spin');

    // --- TRANSIÇÃO ---
    cy.wait('@getUserProfile');

    // --- ESTADO 2: DASHBOARD ---
    cy.getByData('loading-spinner').should('not.exist');
    cy.getByData('loading-brand').should('not.exist');

    // Valida o Dashboard via Navbar ou abas
    cy.getByData('navbar-home-link').should('be.visible');
    cy.contains('span', 'Para você').should('be.visible');

    // Valida se o indicador de aba ativa está lá
    cy.get('.bg-blue-500').should('be.visible');
  });

  it('2. Deve redirecionar para o Login se o perfil retornar 401', () => {
    cy.intercept('GET', '**/accounts/profile/', {
      statusCode: 401,
      body: { detail: 'Unauthorized' },
    }).as('getProfileFail');

    localStorage.setItem('access', 'token-invalido');
    cy.visit('/');

    cy.wait('@getProfileFail');

    // Verifica o redirecionamento e a identidade da página de Login
    cy.url().should('include', '/login');
    cy.getByData('login-title').should('contain', 'Mindly');
    cy.contains('A tua jornada começa com um clique.').should('be.visible');
  });
});
