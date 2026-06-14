import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import BlockedUsersList from './BlockedUsersList';

describe('<BlockedUsersList />', () => {
  const mockBlockedUsers = [
    {
      id: 'uuid-1',
      username: 'user_bloqueado_1',
      display_name: 'Usuário Um',
      profile_picture: null,
    },
    {
      id: 'uuid-2',
      username: 'user_bloqueado_2',
      display_name: 'Usuário Dois',
      profile_picture: null,
    },
  ];

  beforeEach(() => {
    cy.intercept('GET', '**/api/accounts/profiles/blocked-users/', {
      statusCode: 200,
      body: mockBlockedUsers,
    }).as('getBlockedUsers');

    cy.intercept('POST', '**/api/accounts/profiles/*/block/', {
      statusCode: 200,
      body: { message: 'Utilizador desbloqueado.' },
    }).as('postUnblock');

    cy.mount(
      <BrowserRouter>
        <BlockedUsersList />
      </BrowserRouter>
    );
  });

  it('Deve renderizar a lista de utilizadores bloqueados corretamente', () => {
    cy.wait('@getBlockedUsers');

    // 1. Uso do seletor específico para o título
    cy.getByData('blocked-list-title').should('contain', 'Blocked Users');

    // 2. Validação baseada nos cards individuais
    cy.getByData('blocked-user-card-user_bloqueado_1').should('be.visible');
    cy.getByData('blocked-user-card-user_bloqueado_2').should('be.visible');

    // 3. Validação robusta: conta os botões que realmente são de unblock
    cy.get('[data-cy^="unblock-btn-"]').should('have.length', 2);
  });

  it('Deve remover o utilizador da lista ao clicar em Unblock', () => {
    cy.wait('@getBlockedUsers');

    // 4. Clique no botão específico usando nosso comando utilitário
    cy.getByData('unblock-btn-user_bloqueado_1').click();

    cy.wait('@postUnblock');

    // 5. Verifica se o CARD sumiu, não apenas o texto
    cy.getByData('blocked-user-card-user_bloqueado_1').should('not.exist');
    cy.getByData('blocked-user-card-user_bloqueado_2').should('be.visible');

    // Garante que só sobrou 1 botão de unblock
    cy.get('[data-cy^="unblock-btn-"]').should('have.length', 1);
  });

  it('Deve mostrar mensagem vazia quando não houver bloqueados', () => {
    cy.intercept('GET', '**/api/accounts/profiles/blocked-users/', {
      statusCode: 200,
      body: [],
    }).as('getEmptyList');

    cy.mount(
      <BrowserRouter>
        <BlockedUsersList />
      </BrowserRouter>
    );

    cy.wait('@getEmptyList');

    // 6. Validação direta pelo seletor de mensagem vazia que criamos
    cy.getByData('empty-list-message')
      .should('be.visible')
      .and('contain', "You haven't blocked anyone yet.");
  });
});
