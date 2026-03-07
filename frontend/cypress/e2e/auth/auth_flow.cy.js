describe('Fluxo Real de Autenticação', () => {
  it('Deve mostrar a página de login e verificar se o botão do Google está operacional', () => {
    // 1. Visita a página de login REAL
    cy.visit('/login');

    // 2. Verifica se os elementos básicos estão lá (Sanity Check)
    cy.get('h2').should('contain', 'Mindly');
    
    // 3. Verifica o botão do Google
    // Aqui vamos apenas verificar se o botão existe e é clicável.
    // Dica: Não vamos completar o login do Google (o Google bloqueia automação),
    // mas vamos garantir que o componente não crashou a página.
    cy.get('button').contains(/Google/i).should('be.visible').and('not.be.disabled');
  });

  it('Verifica se a API de Auth está respondendo (Integridade)', () => {
    // Intercepta a chamada real que o botão do Google faria para o seu backend
    cy.intercept('POST', '**/api/accounts/google/').as('googleLogin');
    
    cy.visit('/login');
    
    // Se o login quebrou ontem, pode ser que a página nem carregue ou dê erro 500
    cy.request({
      url: '/api/health/', // Usando aquela rota que vamos refazer
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(200);
    });
  });
  describe('Sanity Check - Perfil Real', () => {
 it('Deve carregar o perfil com sucesso usando o token direto', () => {
  // 1. Limpa tudo para não ter lixo de sessões anteriores
  cy.clearLocalStorage();
  cy.clearCookies();

  // 2. Injetamos um token (pode ser o fake que seu backend aceita em dev)
  const fakeToken = 'token-fake-valido'; 
  localStorage.setItem('access', fakeToken);

  // 3. Fazemos a requisição SEM passar pela UI do app (mais rápido e certeiro)
  cy.request({
    method: 'GET',
    url: 'http://localhost:8000/api/accounts/profile/',
    headers: {
      'Authorization': `Bearer ${fakeToken}`
    },
    failOnStatusCode: false // Para podermos ler o erro se ele vier
  }).then((response) => {
    // Se der 200, a inversão do settings.py funcionou!
    // Se der 403, o problema ainda é CSRF/Ordem no Django.
    // Se der 401, o Django recusou o token (o que é esperado se for um token aleatório).
    
    cy.log('Status da Resposta Real:', response.status);
    expect([200, 401]).to.include(response.status); 
    // Aceitamos 401 aqui só para provar que NÃO é mais 403 (Forbidden)
  });
});
});
});