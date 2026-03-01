import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import BlockedUsersList from './BlockedUsersList';

describe('<BlockedUsersList />', () => {
  const mockBlockedUsers = [
    {
      id: 'uuid-1',
      username: 'user_bloqueado_1',
      display_name: 'Usuário Um',
      profile_picture: null
    },
    {
      id: 'uuid-2',
      username: 'user_bloqueado_2',
      display_name: 'Usuário Dois',
      profile_picture: null
    }
  ];

  beforeEach(() => {
    // Intercepta a chamada GET que definimos no Pytest
    cy.intercept('GET', '**/api/accounts/profiles/blocked-users/', {
      statusCode: 200,
      body: mockBlockedUsers
    }).as('getBlockedUsers');

    // Intercepta o POST de desbloqueio (Toggle)
    cy.intercept('POST', '**/api/accounts/profiles/*/block/', {
      statusCode: 200,
      body: { message: "Utilizador desbloqueado." }
    }).as('postUnblock');

    // Monta o componente dentro de um Router (necessário por causa do <Link>)
    cy.mount(
      <BrowserRouter>
        <BlockedUsersList />
      </BrowserRouter>
    );
  });

  it('Deve renderizar a lista de utilizadores bloqueados corretamente', () => {
    cy.wait('@getBlockedUsers');
    
    cy.get('h2').should('contain', 'Blocked Users');
    cy.contains('@user_bloqueado_1').should('be.visible');
    cy.contains('@user_bloqueado_2').should('be.visible');
    cy.get('button').should('have.length', 2);
  });

  it('Deve remover o utilizador da lista ao clicar em Unblock', () => {
    cy.wait('@getBlockedUsers');

    // Clica no botão de desbloquear do primeiro usuário
    cy.get('[data-cy="unblock-btn-user_bloqueado_1"]').click();

    // Verifica se a chamada para o backend foi feita
    cy.wait('@postUnblock');

    // O utilizador 1 deve sumir, restando apenas o 2
    cy.contains('@user_bloqueado_1').should('not.exist');
    cy.contains('@user_bloqueado_2').should('be.visible');
    cy.get('button').should('have.length', 1);
  });

  it('Deve mostrar mensagem vazia quando não houver bloqueados', () => {
    cy.intercept('GET', '**/api/accounts/profiles/blocked-users/', {
      statusCode: 200,
      body: []
    }).as('getEmptyList');

    cy.mount(
      <BrowserRouter>
        <BlockedUsersList />
      </BrowserRouter>
    );

    cy.wait('@getEmptyList');
    cy.contains("You haven't blocked anyone yet.").should('be.visible');
  });
});