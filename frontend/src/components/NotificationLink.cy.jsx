import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import NotificationsPage from './NotificationLink';

describe('<NotificationsPage /> - Component Test', () => {
  const mockNotifications = [
    { id: 10, notification_type: 'LIKE', sender_name: 'Cristiano', is_read: false, post_content: 'Frontend com Cypress é top!', sender_avatar: null },
    { id: 11, notification_type: 'COMMENT', sender_name: 'Ana', is_read: true, post_content: 'Concordo plenamente!', sender_avatar: null },
  ];

  it('1. Deve exibir o texto de carregamento inicial', () => {
    cy.intercept('GET', '**/notifications/**', (req) => {
      req.reply({ delay: 200, body: mockNotifications });
    }).as('getNotifications');

    cy.intercept('POST', '**/notifications/mark_all_as_read/**', { statusCode: 200, body: {} })
      .as('markAllRead');

    cy.mount(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    cy.contains(/a carregar/i).should('be.visible');
  });

  it('2. Deve carregar as notificações e disparar o mark_all_as_read se houver não lidas', () => {
    cy.intercept('GET', '**/notifications/**', mockNotifications).as('getNotifications');
    cy.intercept('POST', '**/notifications/mark_all_as_read/**', { statusCode: 200, body: {} }).as('markAllRead');

    cy.mount(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    cy.wait('@getNotifications');
    cy.wait('@markAllRead');

    cy.contains('Cristiano').should('be.visible');
    cy.contains(/curtiu o teu post/i).should('be.visible');
  });

  it('3. Deve renderizar os ícones e cores de fundo corretas', () => {
    cy.intercept('GET', '**/notifications/**', mockNotifications).as('getNotifications');
    cy.intercept('POST', '**/notifications/mark_all_as_read/**', { statusCode: 200, body: {} }).as('markAllRead');

    cy.mount(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    cy.wait('@getNotifications');
    cy.get('svg.text-pink-600').should('exist');

    cy.contains('Cristiano')
      .parents('.flex.gap-4')
      .should('have.class', 'bg-blue-900/10');
  });

  it('4. Deve mostrar mensagem caso a lista esteja vazia', () => {
    cy.intercept('GET', '**/notifications/**', []).as('getEmpty');

    cy.mount(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    cy.wait('@getEmpty');
    cy.contains(/Ainda não tens notificações/i).should('be.visible');
  });

  it('5. Deve renderizar o conteúdo do post quando disponível', () => {
    cy.intercept('GET', '**/notifications/**', mockNotifications).as('getNotifications');
    cy.intercept('POST', '**/notifications/mark_all_as_read/**', { statusCode: 200, body: {} }).as('markAllRead');

    cy.mount(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    cy.wait('@getNotifications');
    cy.contains('Frontend com Cypress é top!').should('be.visible');
    cy.contains('Concordo plenamente!').should('be.visible');
  });
});