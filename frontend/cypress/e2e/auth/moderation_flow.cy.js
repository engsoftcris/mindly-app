describe('Fluxo de Moderação e Denúncia', () => {
  beforeEach(() => {
    cy.login({ username: 'testuser', seedFeed: false });
    
    cy.intercept('GET', '**/api/accounts/profile/**', {
      statusCode: 200,
      body: { 
        id: 99, 
        username: 'testuser',
        email: 'test@example.com'
      }
    }).as('getProfile');

    cy.intercept('GET', '**/api/accounts/feed/**', {
      statusCode: 200,
      body: {
        count: 1,
        next: null,
        previous: null,
        results: [{
          id: 500,
          content: 'Conteúdo de terceiros para teste',
          author: { 
            id: 1, 
            username: 'estranho', 
            display_name: 'Usuário Estranho' 
          },
          created_at: new Date().toISOString(),
          media_url: null,
          likes_count: 0,
          comments_count: 0,
          is_liked: false,
          moderation_status: 'APPROVED'
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

    cy.intercept('GET', '**/api/accounts/suggested-follows/**', {
      statusCode: 200,
      body: []
    }).as('getSuggested');

    cy.visit('/dashboard');
    cy.wait(['@getProfile', '@getFeed'], { timeout: 10000 });
  });

  it('deve mostrar feedback visual após denunciar um post', () => {
    cy.contains('Conteúdo de terceiros para teste').should('be.visible');

    cy.get('[data-cy="open-report-modal"]').first().click();
    cy.contains('h3', 'Denunciar Post', { timeout: 10000 }).should('be.visible');
    cy.get('select').should('exist').select('spam', { force: true });
    cy.get('[data-cy="confirm-report-button"]').click();
    cy.wait('@submitReport', { timeout: 10000 });
    cy.get('.Toastify__toast', { timeout: 10000 })
      .should('be.visible')
      .and('contain', 'Obrigado');
    cy.get('body').should('not.contain', 'Denunciar Post');
  });

  it('deve mostrar a notificação de denúncia resolvida para o autor', () => {
    // CORREÇÃO: Rota SEM /accounts/ (igual aos comentários)
    cy.intercept('GET', '**/api/notifications/**', {
      statusCode: 200,
      body: [
        {
          id: 1,
          notification_type: 'REPORT_UPDATE',
          text: 'Sua denúncia foi analisada e o conteúdo foi removido.',
          created_at: new Date().toISOString(),
          read: false,
          post_content: 'Conteúdo de terceiros para teste'
        }
      ]
    }).as('getNotificationsTest');

    cy.visit('/notifications');
    cy.wait('@getNotificationsTest', { timeout: 10000 });

    cy.contains('Sua denúncia foi analisada', { timeout: 10000 }).should('be.visible');
  });
});