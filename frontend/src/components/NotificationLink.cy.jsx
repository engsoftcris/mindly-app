import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import NotificationsPage from './NotificationLink';

describe('<NotificationsPage /> - Component Test', () => {
  const mockNotifications = [
    {
      id: 10,
      notification_type: 'LIKE',
      sender_name: 'Cristiano',
      is_read: false,
      post_content: 'Frontend com Cypress é top!',
      sender_avatar: null
    },
    {
      id: 11,
      notification_type: 'COMMENT',
      sender_name: 'Ana',
      is_read: true,
      post_content: 'Concordo plenamente!',
      sender_avatar: null
    }
  ];

  beforeEach(() => {
    // Reset any stubs/spies before each test
    cy.intercept('GET', '**/api/notifications/', {
      statusCode: 200,
      body: mockNotifications
    }).as('getNotifications');
    
    cy.intercept('POST', '**/api/notifications/mark_all_as_read/', {
      statusCode: 200
    }).as('markAllRead');
  });

  it('1. Deve exibir o texto de carregamento inicial', () => {
    cy.mount(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );
    
    cy.contains(/A carregar/i).should('be.visible');
    
    // Wait for the request to complete to ensure test doesn't fail due to pending requests
    cy.wait('@getNotifications');
  });

  it('2. Deve carregar as notificações e disparar o mark_all_as_read se houver não lidas', () => {
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
    cy.mount(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    cy.wait('@getNotifications');

    // Check for the LIKE icon (heart)
    cy.get('svg').first().should('have.class', 'text-pink-600');
    
    // Check background color for unread notification
    cy.contains('Cristiano')
      .parents('div[class*="flex gap-4"]')
      .first()
      .should('have.class', 'bg-blue-900/10');
  });

  it('4. Deve mostrar mensagem caso a lista esteja vazia', () => {
    // Override the intercept for this specific test
    cy.intercept('GET', '**/api/notifications/', {
      statusCode: 200,
      body: []
    }).as('getEmpty');

    cy.mount(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );
    
    cy.wait('@getEmpty');
    cy.contains(/Ainda não tens notificações/i).should('be.visible');
  });

  it('5. Deve renderizar o conteúdo do post quando disponível', () => {
    cy.mount(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    cy.wait('@getNotifications');
    cy.contains('Frontend com Cypress é top!').should('be.visible');
  });
});