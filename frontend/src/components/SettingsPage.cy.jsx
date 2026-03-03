import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import SettingsPage from './SettingsPage';
import AuthContext from '../context/AuthContext';

describe('<SettingsPage /> - Teste de Configurações', () => {
  let mockAuthContext;

  beforeEach(() => {
    const mockLogout = cy.stub().as('logoutStub');

    localStorage.clear();

    // ✅ keys corretas do seu app
    localStorage.setItem('access', 'fake-token');
    localStorage.setItem('refresh', 'fake-refresh');

    // ✅ mockAuthContext criado DEPOIS do stub
    mockAuthContext = {
      user: { username: 'testuser' },
      logout: mockLogout,
      updateUser: cy.stub().as('updateUserStub'),
      loading: false,
      followingIds: new Set(),
      updateFollowing: () => {},
      isFollowing: () => false,
      refreshFollowing: () => {},
    };

    // ✅ endpoint mais preciso (ajuste pra /api/ se for o caso)
    cy.intercept('GET', '**/accounts/profile/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        display_name: 'Seu Mundo Mindly',
        bio: 'Minha bio antiga',
        email: 'test@test.com',
        is_private: false,
      },
    }).as('getSettings');
  });

  it('1. Deve atualizar nome, bio e privacidade com sucesso', () => {
    cy.intercept('PATCH', '**/accounts/profile/', {
      delay: 200,
      statusCode: 200,
      body: {
        display_name: 'Novo Nome',
        bio: 'Nova Bio',
        is_private: true,
      },
    }).as('patchSettings');

    cy.mount(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuthContext}>
          <SettingsPage />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    cy.wait('@getSettings');

    cy.get('[data-cy="settings-input-display-name"]').clear().type('Novo Nome');
    cy.get('[data-cy="settings-input-bio"]').clear().type('Nova Bio');
    cy.get('[data-cy="settings-privacy-toggle"]').click();
    cy.get('[data-cy="settings-submit-button"]').click();

    cy.contains('Saving...').should('be.visible');
    cy.wait('@patchSettings');
    cy.contains('Settings updated successfully! ✅').should('be.visible');

    // opcional: garante que updateUser foi chamado
    cy.get('@updateUserStub').should('have.been.called');
    cy.get('@updateUserStub').should('have.been.calledOnce');
  });

 it('2. Deve mostrar erro se a atualização falhar', () => {
  cy.intercept('PATCH', '**/accounts/profile/', {
    statusCode: 500,
    body: { error: 'Server error' },
  }).as('updateFail');

  cy.mount(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <SettingsPage />
      </AuthContext.Provider>
    </BrowserRouter>
  );

  cy.wait('@getSettings');
  cy.get('[data-cy="settings-submit-button"]').click();

  cy.wait('@updateFail').its('response.statusCode').should('eq', 500);

  cy.get('[data-cy="settings-status-message"]')
    .should('be.visible')
    .and('contain', 'Failed to update settings.');

  cy.get('@updateUserStub').should('not.have.been.called');
  cy.get('@logoutStub').should('not.have.been.called');
  cy.url().should('not.include', '/login');
});
it('3. Deve redirecionar para /login se o PATCH retornar 401 (sessão expirada)', () => {
  // Força cenário de sessão expirada
  localStorage.removeItem('refresh');
  localStorage.setItem('access', 'fake-token');

  cy.intercept('PATCH', '**/accounts/profile/', {
    statusCode: 401,
    body: { error: 'Unauthorized' },
  }).as('updateUnauthorized');

  // Stub para o window.location para não tentar navegar de verdade no iframe
  cy.window().then((win) => {
    cy.stub(win.location, 'href', { set: cy.stub().as('locationHref') });
  });

  cy.mount(
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        <SettingsPage />
      </AuthContext.Provider>
    </BrowserRouter>
  );

  cy.wait('@getSettings');
  cy.get('[data-cy="settings-submit-button"]').click();

  cy.wait('@updateUnauthorized')
    .its('response.statusCode')
    .should('eq', 401);

  // ✅ EM VEZ DE cy.url(), verificamos se o setter do href foi chamado com '/login'
  // Nota: Dependendo de como o axios está configurado, ele pode usar a URL completa ou relativa
  cy.get('@locationHref').should('be.calledWith', '/login');

  // Confirma que os tokens foram limpos
  cy.window().then((win) => {
    expect(win.localStorage.getItem('access')).to.be.null;
    expect(win.localStorage.getItem('refresh')).to.be.null;
  });
});
});