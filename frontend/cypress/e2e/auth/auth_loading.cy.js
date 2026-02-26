describe('Fluxo de Autenticação e Loading - Mindly', () => {
  
  beforeEach(() => {
    // Garante um estado limpo antes de começar
    cy.clearLocalStorage();
  });

  it('Deve mostrar a tela de Loading (1.5s) e transicionar para o Dashboard com sucesso', () => {
    const MIN_DELAY = 1500;

    // 1. Interceptar a chamada de Perfil com o delay que você escolheu
    cy.intercept('GET', '**/accounts/profile/', {
      delay: MIN_DELAY,
      statusCode: 200,
      body: { 
        id: 1, 
        username: 'cristiano', 
        display_name: 'Cristiano', 
        email: 'cris@test.com'
      }
    }).as('getUserProfile');

    // 2. Interceptar as chamadas automáticas do Dashboard (Feed e Notificações)
    // Isso evita que o teste falhe por erros de rede no backend real
    cy.intercept('GET', '**/posts/', { 
      statusCode: 200, 
      body: { results: [], next: null } 
    }).as('getPosts');

    cy.intercept('GET', '**/notifications/', { 
      statusCode: 200, 
      body: [] 
    }).as('getNotifications');

    // 3. Simular o token no localStorage
    localStorage.setItem('access', 'fake-token-valido');

    // 4. Visitar a aplicação
    cy.visit('/');

    // --- ESTADO 1: LOADING ---
    // Verifica se a LoadingScreen está ativa (h1 com Mindly e Spinner)
    cy.get('h1').contains('Mindly').should('be.visible');
    cy.get('.animate-spin').should('be.visible');

    // --- TRANSIÇÃO ---
    // Aguarda o término da chamada de perfil (esperando o delay de 1.5s)
    cy.wait('@getUserProfile');

    // --- ESTADO 2: DASHBOARD ---
    // O Loading deve desaparecer primeiro
    cy.get('.animate-spin').should('not.exist');
    cy.contains('h1', 'Mindly').should('not.exist');

    // O Dashboard deve aparecer (Validando pelas abas do seu código)
    cy.contains('span', 'Para você').should('be.visible');
    cy.contains('span', 'Seguindo').should('be.visible');
    
    // Valida se a borda da aba ativa ("Para você") está lá
    cy.get('.bg-blue-500').should('be.visible'); 
  });

  it('Deve redirecionar para o Login se o perfil retornar 401', () => {
    cy.intercept('GET', '**/accounts/profile/', {
      statusCode: 401,
      body: { detail: 'Unauthorized' }
    }).as('getProfileFail');

    localStorage.setItem('access', 'token-invalido');

    cy.visit('/');

    cy.wait('@getProfileFail');

    // Verifica se voltou para a página de login
    cy.url().should('include', '/login');
    cy.contains('A tua jornada começa com um clique.').should('be.visible');
  });
});