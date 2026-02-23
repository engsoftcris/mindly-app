describe('Fluxo de Moderação e Denúncia', () => {
beforeEach(() => {
  cy.login('testuser', 'password123'); 
  
  // MOCK DO PERFIL
  cy.intercept('GET', '**/api/accounts/profile/**', {
    statusCode: 200,
    body: { 
      id: 99, 
      username: 'testuser',
      email: 'test@example.com'
    }
  }).as('getProfile');

  // MOCK DO FEED - MAIS EXPLÍCITO
  cy.intercept('GET', '**/api/posts/**', {
    statusCode: 200,
    body: {
      results: [{
        id: 500,
        content: 'Conteúdo de terceiros para teste',
        author: { 
          id: 1, 
          username: 'estranho', 
          display_name: 'Usuário Estranho' 
        },
        created_at: new Date().toISOString(),
        media_urls: [],
        like_count: 0,
        comment_count: 0,
        is_liked: false,
        is_reported: false
      }]
    }
  }).as('getFeed');

  cy.intercept('POST', '**/api/reports/**', {
    statusCode: 201,
    body: { 
      message: 'Report created successfully',
      report_id: 123 
    }
  }).as('submitReport');

  cy.visit('/dashboard'); // ou a rota correta
  cy.wait(['@getProfile', '@getFeed']);
});

it('deve mostrar feedback visual após denunciar um post', () => {
  cy.contains('Conteúdo de terceiros para teste').should('be.visible');

  // 1. Clica para abrir
  cy.get('[data-cy="open-report-modal"]').first().click();

  // 2. ESPERA ESSENCIAL: Garante que o modal renderizou
  // Isso impede o erro de "select not found"
  cy.contains('h3', 'Denunciar Post', { timeout: 10000 }).should('be.visible');

  // 3. Interage com o select (usando force para garantir)
  cy.get('select').should('exist').select('spam', { force: true });
  
  // 4. Confirma a denúncia
  cy.get('[data-cy="confirm-report-button"]').click();

  // 5. Espera a resposta do servidor (POST 201)
  cy.wait('@submitReport');

  // 6. VALIDAÇÃO PARA ENCERRAR O TESTE E O LOOP:
  // Verificamos que o Toast apareceu
  cy.get('.Toastify__toast')
    .should('be.visible')
    .and('contain', 'Obrigado');

  // 7. Garante que o modal FECHOU (Isso mata o loop infinito)
  cy.get('body').should('not.contain', 'Denunciar Post');
  
  cy.log('Fluxo finalizado com sucesso.');
});

  it('deve mostrar a notificação de denúncia resolvida para o autor', () => {
    // Garanta que o arquivo cypress/fixtures/notifications_report.json existe!
    cy.intercept('GET', '**/notifications/', {
      fixture: 'notifications_report.json'
    }).as('getNotifications');

    cy.visit('/notifications');
    cy.wait('@getNotifications');

    cy.contains('Denúncia aceite').should('be.visible');
    cy.contains('O conteúdo foi removido').should('be.visible');
  });
});