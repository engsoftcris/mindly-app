import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage';
import { AuthProvider } from '../context/AuthContext';

describe('<ProfilePage /> - Suite de Perfil', () => {
  
  beforeEach(() => {
    // 1. Garante que o localStorage tenha o token para não ser barrado pelo PrivateRoute
    localStorage.setItem('access', 'fake-token');

    // 2. Mock do GET inicial
    cy.intercept('GET', '**/accounts/profile/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        display_name: 'Seu Mundo Mindly',
        bio: 'Minha bio antiga',
        email: 'test@test.com'
      }
    }).as('getProfile');
  });

  it('1. Deve carregar dados e atualizar com sucesso (ignora timing do saving)', () => {
    // Adicionamos um pequeno delay no PATCH para o estado de "Saving..." existir por um momento
    cy.intercept('PATCH', '**/accounts/profile/me/', {
      delay: 200, 
      statusCode: 200,
      body: {
        display_name: 'Novo Nome Cypress',
        bio: 'Nova Bio Atualizada'
      }
    }).as('updateProfile');

    cy.mount(
      <BrowserRouter>
        <AuthProvider>
          <ProfilePage />
        </AuthProvider>
      </BrowserRouter>
    );

    cy.wait('@getProfile');

    // Edição
    cy.get('input[placeholder="Your name"]').clear().type('Novo Nome Cypress');
    cy.get('textarea[placeholder="What\'s on your mind?"]').clear().type('Nova Bio Atualizada');

    // Clique no botão
    cy.get('button').contains('Save Changes').click();

    // Verificamos o estado de carregamento (O delay de 200ms garante que ele apareça)
    cy.contains('Saving...').should('be.visible');
    cy.get('button').should('be.disabled');

    // Espera a conclusão
    cy.wait('@updateProfile');
    cy.contains('Profile updated successfully! ✅').should('be.visible');

    // Verifica se os valores foram mantidos
    cy.get('input[placeholder="Your name"]').should('have.value', 'Novo Nome Cypress');
  });

  it('2. Deve mostrar erro se a atualização falhar', () => {
    cy.intercept('PATCH', '**/accounts/profile/me/', {
      statusCode: 400
    }).as('updateFail');

    cy.mount(
      <BrowserRouter>
        <AuthProvider>
          <ProfilePage />
        </AuthProvider>
      </BrowserRouter>
    );

    cy.wait('@getProfile');
    cy.get('button').contains('Save Changes').click();
    
    cy.wait('@updateFail');
    cy.contains('Failed to update profile. ❌').should('be.visible');
  });
});