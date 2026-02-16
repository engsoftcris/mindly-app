import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage';
import { AuthProvider } from '../context/AuthContext';

describe('<ProfilePage /> - Suite de Perfil', () => {
  
  beforeEach(() => {
    localStorage.setItem('access', 'fake-token');

    // 1. BLOQUEIO DE REDIRECT: Impede que qualquer chamada antiga deslogue o teste
    cy.intercept('GET', '**/accounts/profile/', { statusCode: 200, body: {} });
    
    // 2. Mock do GET correto
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
    }).as('getProfile');
  });

  it('1. Deve carregar dados e atualizar com sucesso', () => {
    cy.intercept('PATCH', '**/accounts/profile/me/', {
      delay: 200, 
      statusCode: 200,
      body: {
        display_name: 'Novo Nome Cypress',
        bio: 'Nova Bio Atualizada',
        is_private: true
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

    // Garante que o loading acabou e o formulário está visível
    cy.contains('Profile Settings').should('be.visible');

    // Preenchimento de Campos
    cy.contains('label', 'Display Name').parent().find('input').clear().type('Novo Nome Cypress');
    cy.contains('label', 'Bio').parent().find('textarea').clear().type('Nova Bio Atualizada');

    // SELETOR DO PRIVACY SWITCH (Ajustado para o seu JSX real)
    // Buscamos o container que tem o texto e clicamos no botão dentro dele
  // 1. Localiza o texto 
    // 2. Sobe até o container pai (a div que engloba tudo do switch)
    // 3. Acha o único botão lá dentro
    cy.contains('Private Profile')
    // 1. Acha o texto "Private Profile"
    // 2. Sobe até o container principal daquela linha (o que tem a borda e o fundo cinza)
    // 3. Clica no botão
    cy.contains('Private Profile')
   // Busca o botão de toggle que está na mesma seção do texto "Private Profile"
    cy.contains('Private Profile')
      .parentsUntil('form') // Sobe até quase o topo do formulário
      .find('button[type="button"]') // Busca o botão de ação (o switch)
      .first()
      .click({ force: true });
    
    // Fallback caso o de cima falhe: tenta achar qualquer botão perto do texto
    // cy.get('h3').contains('Private Profile').parents().find('button[role="button"], button:not([type="submit"])').first().click();

    // Salvar
    cy.get('button').contains('Save Changes').click();

    cy.contains('Saving...').should('be.visible');
    cy.wait('@updateProfile');
    cy.contains('Profile updated successfully! ✅').should('be.visible');

    cy.contains('label', 'Display Name').parent().find('input').should('have.value', 'Novo Nome Cypress');
  });

  it('2. Deve mostrar erro se a atualização falhar', () => {
    cy.intercept('PATCH', '**/accounts/profile/me/', { statusCode: 400 }).as('updateFail');

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

  it('3. Deve mostrar a seção de Manage Followers', () => {
    cy.intercept('GET', '**/accounts/profile/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        display_name: 'User Test',
        followers: [{ id: 99, username: 'follower1', display_name: 'Follower One' }]
      }
    });

    cy.mount(
      <BrowserRouter>
        <AuthProvider>
          <ProfilePage />
        </AuthProvider>
      </BrowserRouter>
    );

    cy.contains('Manage Followers').should('be.visible');
    cy.contains('@follower1').should('be.visible');
    cy.contains('button', 'Remove').should('be.visible');
  });
});