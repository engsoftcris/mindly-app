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

  // Helper para montar com os intercepts já prontos
  const setupAndMount = (notifications = mockNotifications) => {
    // Usar Regex no intercept elimina falhas por causa de barras ou domínios no CI
    cy.intercept('GET', /.*\/api\/notifications\/?$/, notifications).as('getNotifications');
    cy.intercept('POST', /.*\/api\/notifications\/mark_all_as_read\/?$/, { statusCode: 200 }).as('markAllRead');

    cy.mount(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );
  };

  it('1. Deve exibir o texto de carregamento inicial', () => {
    setupAndMount();
    cy.contains(/A carregar/i).should('be.visible');
  });

  it('2. Deve carregar as notificações e disparar o mark_all_as_read se houver não lidas', () => {
    setupAndMount();

    // No GitHub Actions, 5s é pouco. 15s garante que a rede virtual do container responda.
    cy.wait('@getNotifications', { timeout: 15000 });
    cy.wait('@markAllRead', { timeout: 15000 });
    
    cy.contains('Cristiano').should('be.visible');
    cy.contains(/curtiu o teu post/i).should('be.visible');
  });

  it('3. Deve renderizar os ícones e cores de fundo corretas', () => {
    setupAndMount();
    cy.wait('@getNotifications', { timeout: 15000 });

    cy.get('svg.text-pink-600').should('exist');
    cy.contains('Cristiano')
      .parents('.flex.gap-4')
      .should('have.class', 'bg-blue-900/10');
  });

  it('4. Deve mostrar mensagem caso a lista esteja vazia', () => {
    cy.intercept('GET', /.*\/api\/notifications\/?$/, []).as('getEmpty');
    cy.mount(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );
    
    cy.wait('@getEmpty', { timeout: 15000 });
    cy.contains(/Ainda não tens notificações/i).should('be.visible');
  });

  it('5. Deve renderizar o conteúdo do post quando disponível', () => {
    setupAndMount();
    cy.wait('@getNotifications', { timeout: 15000 });
    cy.contains('Frontend com Cypress é top!').should('be.visible');
  });
});