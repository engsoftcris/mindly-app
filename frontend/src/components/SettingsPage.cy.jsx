import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import SettingsPage from './SettingsPage';
import { AuthProvider } from '../context/AuthContext';

describe('<SettingsPage /> - Teste de Configurações', () => {
  
  beforeEach(() => {
    // Limpa e prepara o terreno
    localStorage.clear();
    localStorage.setItem('access_token', 'fake-token');

    // 1. Único Mock do GET para carregar a página
    // Removi o conflito. Use a URL exata que o seu componente chama.
    cy.intercept('GET', '**/accounts/profile/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        display_name: 'Seu Mundo Mindly',
        bio: 'Minha bio antiga',
        email: 'test@test.com',
        is_private: false,
      }
    }).as('getSettings');
  });

 it('1. Deve atualizar nome, bio e privacidade com sucesso', () => {
    // Adicionamos um DELAY para o botão não mudar de texto instantaneamente
    cy.intercept('PATCH', '**/accounts/profile/', {
      delay: 1000, // 1 segundo de espera simulada
      statusCode: 200,
      body: {
        display_name: 'Novo Nome',
        bio: 'Nova Bio',
        is_private: true,
      },
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

    // Clica e valida o estado intermediário
    cy.get('[data-cy="settings-submit-button"]').click();

    // AGORA SIM: Como a API demora 1s, o Cypress vai conseguir ver o "Saving..."
    cy.contains('Saving...').should('be.visible');

    // Espera a resposta chegar
    cy.wait('@patchSettings');

    // Valida o sucesso final
    cy.contains('Settings updated successfully! ✅').should('be.visible');
  });
  
  it('2. Deve mostrar erro se a atualização falhar', () => {
    // Mock do PATCH com erro
    cy.intercept('PATCH', '**/accounts/profile/', { statusCode: 401 }).as('updateFail');

    cy.mount(
      <BrowserRouter>
        <AuthProvider>
          <SettingsPage />
        </AuthProvider>
      </BrowserRouter>
    );

    cy.wait('@getSettings');
    
    // Tenta salvar sem mudar nada para disparar o erro
    cy.get('[data-cy="settings-submit-button"]').click();
    
    cy.wait('@updateFail');
    
    // Verifica a mensagem de erro definida no seu catch
    cy.contains('Failed to update settings. ❌').should('be.visible');
  });
});