import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import NotificationsPage from './NotificationLink';

describe('<NotificationsPage /> - Component Test', () => {
  const mockNotifications = [
    {
      id: 10,
      notification_type: 'LIKE',
      sender_name: 'Cristiano',
      is_read: false, // Uma notificação não lida para disparar o "mark_all"
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
    // Intercepta o GET inicial
    cy.intercept('GET', '**/api/notifications/', mockNotifications).as('getNotifications');
    
    // Intercepta o POST automático de "marcar todas como lidas"
    cy.intercept('POST', '**/api/notifications/mark_all_as_read/', { statusCode: 200 }).as('markAllRead');

    cy.mount(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );
  });

  it('1. Deve exibir o texto de carregamento inicial', () => {
    cy.contains('A carregar...').should('be.visible');
  });

  it('2. Deve carregar as notificações e disparar o mark_all_as_read se houver não lidas', () => {
    cy.wait('@getNotifications');
    
    // Verifica se disparou o POST automático devido à notificação do Cristiano (is_read: false)
    cy.wait('@markAllRead');
    
    cy.contains('Cristiano').should('be.visible');
    cy.contains('curtiu o teu post').should('be.visible');
  });

  it('3. Deve renderizar os ícones e cores de fundo corretas', () => {
    cy.wait('@getNotifications');

    // Verifica o ícone de LIKE (FaHeart rosa)
    cy.get('svg.text-pink-600').should('exist');
    
    // Verifica a classe de fundo para notificações não lidas (bg-blue-900/10)
    cy.contains('Cristiano')
      .parents('.flex.gap-4')
      .should('have.class', 'bg-blue-900/10');
  });

  it('4. Deve mostrar mensagem caso a lista esteja vazia', () => {
    // Sobrescreve o intercept para retornar lista vazia
    cy.intercept('GET', '**/api/notifications/', []).as('getEmpty');
    
    cy.mount(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );
    
    cy.wait('@getEmpty');
    cy.contains('Ainda não tens notificações.').should('be.visible');
  });

  it('5. Deve renderizar o conteúdo do post quando disponível', () => {
    cy.wait('@getNotifications');
    cy.contains('"Frontend com Cypress é top!"').should('be.visible');
  });
});