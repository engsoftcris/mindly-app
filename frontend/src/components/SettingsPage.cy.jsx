import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import SettingsPage from './SettingsPage'; // Import correto
import { AuthProvider } from '../context/AuthContext';

describe('<SettingsPage /> - Teste de Configurações', () => {
  
  beforeEach(() => {
    localStorage.setItem('access', 'fake-token');

    // Mock do GET inicial para carregar os dados do usuário
    cy.intercept('GET', '**/accounts/profile/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        display_name: 'Seu Mundo Mindly',
        bio: 'Minha bio antiga',
        email: 'test@test.com',
        is_private: false,
        followers: []
      }
    }).as('getSettings');
  });

it('1. Deve atualizar nome, bio e privacidade com sucesso', () => {
    cy.intercept('PATCH', '**/accounts/profile/me/', {
      delay: 500, // ADICIONE ESTE DELAY de 500ms
      statusCode: 200,
      body: {
        display_name: 'Novo Nome',
        bio: 'Nova Bio',
        is_private: true
      }
    }).as('patchSettings');

    cy.mount(
      <BrowserRouter>
        <AuthProvider>
          <SettingsPage />
        </AuthProvider>
      </BrowserRouter>
    );

    cy.wait('@getSettings');

    cy.get('[data-cy="settings-input-display-name"]').clear().type('Novo Nome');
    cy.get('[data-cy="settings-input-bio"]').clear().type('Nova Bio');
    cy.get('[data-cy="settings-privacy-toggle"]').click();

    // Clica no botão
    cy.get('[data-cy="settings-submit-button"]').click();
    
    // AGORA O CYPRESS VAI CONSEGUIR PEGAR O TEXTO "Saving..."
    cy.get('[data-cy="settings-submit-button"]').should('contain', 'Saving...');
    
    // Aguarda o fim do delay e da requisição
    cy.wait('@patchSettings');
    
    // Verifica a mensagem final de sucesso
    cy.get('[data-cy="settings-status-message"]')
      .should('contain', 'Settings updated successfully! ✅');
  });

  it('2. Deve mostrar erro se a atualização falhar', () => {
    cy.intercept('PATCH', '**/accounts/profile/me/', { statusCode: 400 }).as('updateFail');

    cy.mount(
      <BrowserRouter>
        <AuthProvider>
          <SettingsPage />
        </AuthProvider>
      </BrowserRouter>
    );

    cy.wait('@getSettings');
    cy.get('button').contains('Save Changes').click();
    cy.wait('@updateFail');
    
    // Verifica a mensagem de erro que você definiu no catch do handleUpdate
    cy.contains('Failed to update settings. ❌').should('be.visible');
  });

 
});