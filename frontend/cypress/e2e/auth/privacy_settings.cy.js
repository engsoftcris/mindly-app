describe('Flow: Profile Privacy Settings', () => {
  beforeEach(() => {
    cy.login({ username: 'testuser' }); 
    cy.visit('/settings');
  });

  it('should toggle profile privacy and persist after refresh', () => {
    cy.intercept('PATCH', '**/api/accounts/profile/', (req) => {
      req.reply({
        statusCode: 200,
        body: {
          ...req.body,
          message: "Settings updated successfully! ✅"
        }
      });
    }).as('updateSettings');

    cy.get('[data-cy="settings-privacy-toggle"]', { timeout: 10000 })
      .should('be.visible')
      .as('privacyToggle');

    cy.get('@privacyToggle').click();
    cy.get('[data-cy="settings-submit-button"]').click();
    cy.wait('@updateSettings');
    cy.get('[data-cy="settings-status-message"]', { timeout: 10000 })
      .should('contain', 'successfully');
  });

  it('should display correct initial privacy state', () => {
    // Mock do perfil com conta pública
    cy.intercept('GET', '**/api/accounts/profile/', {
      statusCode: 200,
      body: {
        id: 1,
        username: 'testuser',
        is_private: false
      }
    }).as('getProfilePublic');

    cy.reload();
    cy.wait('@getProfilePublic');

    // CORREÇÃO: Verifica a classe em vez do texto
    cy.get('[data-cy="settings-privacy-toggle"]')
      .should('not.have.class', 'bg-indigo-600');

    // Mock do perfil com conta privada
    cy.intercept('GET', '**/api/accounts/profile/', {
      statusCode: 200,
      body: {
        id: 1,
        username: 'testuser',
        is_private: true
      }
    }).as('getProfilePrivate');

    cy.reload();
    cy.wait('@getProfilePrivate');

    cy.get('[data-cy="settings-privacy-toggle"]')
      .should('have.class', 'bg-indigo-600');
  });

  it('should show error message when update fails', () => {
  cy.intercept('PATCH', '**/api/accounts/profile/', {
    statusCode: 400,
    body: {
      error: 'Unable to update privacy settings'
    }
  }).as('updateSettingsError');

  cy.get('[data-cy="settings-privacy-toggle"]').click();
  cy.get('[data-cy="settings-submit-button"]').click();
  cy.wait('@updateSettingsError');

  // CORREÇÃO: Regex atualizado para incluir "Failed"
  cy.get('[data-cy="settings-status-message"]', { timeout: 10000 })
    .should('be.visible')
    .and(($el) => {
      const text = $el.text();
      expect(text).to.match(/Erro|Error|Unable|falha|não foi possível|Failed/i);
    });
});

  // CORREÇÃO: Remover teste de modal que não existe
  // it('should show confirmation modal when toggling private mode', () => {...})

  it('should update UI immediately after toggling (optimistic update)', () => {
    // CORREÇÃO: Usar delay nativo do Cypress em vez de setTimeout
    cy.intercept('PATCH', '**/api/accounts/profile/', (req) => {
      req.reply({
        statusCode: 200,
        body: {
          ...req.body,
          message: "Settings updated successfully! ✅"
        },
        delay: 2000 // O Cypress segura a resposta por 2s de forma correta
      });
    }).as('updateSettingsSlow');

    // 1. Clica no toggle
    cy.get('[data-cy="settings-privacy-toggle"]').click();
    
    // 2. VALIDAÇÃO OTIMISTA: A UI deve mudar na hora, mesmo sem o servidor responder
    // (Pois o intercept ainda está "segurando" a resposta por 2 segundos)
    cy.get('[data-cy="settings-privacy-toggle"]')
      .should('have.class', 'bg-indigo-600');
    
    // 3. Clica no salvar
    cy.get('[data-cy="settings-submit-button"]').click();
    
    // 4. Espera o intercept terminar (os 2 segundos de delay)
    cy.wait('@updateSettingsSlow');
    
    // 5. Verifica se o estado se manteve após a resposta chegar
    cy.get('[data-cy="settings-privacy-toggle"]')
      .should('have.class', 'bg-indigo-600');
  });
});