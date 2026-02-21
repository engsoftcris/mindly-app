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
    // Intercept com console.log (não interfere no fluxo de comandos do Cypress)
    cy.intercept('GET', /.*\/api\/notifications\/?$/, (req) => {
      console.log('--- NETWORK DEBUG: Capturou GET notifications ---');
      req.reply(mockNotifications);
    }).as('getNotifications');

    cy.intercept('POST', /.*\/api\/notifications\/mark_all_as_read\/?$/, (req) => {
      console.log('--- NETWORK DEBUG: Capturou POST mark_all_as_read ---');
      req.reply({ statusCode: 200 });
    }).as('markAllRead');

    cy.mount(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );
  });

  it('1. Deve exibir o texto de carregamento inicial', () => {
    cy.log('TEST 1: Verificando loading state');
    cy.contains(/carregar/i).should('be.visible');
  });

  it('2. Deve carregar as notificações e disparar o mark_all_as_read se houver não lidas', () => {
    cy.log('TEST 2: Aguardando requests de inicialização');
    
    // Timeout longo para o GitHub Actions não engasgar
    cy.wait('@getNotifications', { timeout: 15000 });
    cy.log('DEBUG: GET Notifications recebido');
    
    cy.wait('@markAllRead', { timeout: 15000 });
    cy.log('DEBUG: POST Mark All Read recebido');
    
    cy.contains('Cristiano').should('be.visible');
    cy.contains(/curtiu o teu post/i).should('be.visible');
  });

  it('3. Deve renderizar os ícones e cores de fundo corretas', () => {
    cy.log('TEST 3: Verificando UI e Classes CSS');
    cy.wait('@getNotifications', { timeout: 15000 });
    cy.get('svg.text-pink-600').should('exist');
    
    cy.contains('Cristiano')
      .parents('.flex.gap-4')
      .should('have.class', 'bg-blue-900/10');
  });

  it('4. Deve mostrar mensagem caso a lista esteja vazia', () => {
    cy.log('TEST 4: Cenário de lista vazia');
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
    cy.log('TEST 5: Validando conteúdo dos posts carregados');
    cy.wait('@getNotifications', { timeout: 15000 });
    cy.contains('Frontend com Cypress é top!').should('be.visible');
    cy.contains('Concordo plenamente!').should('be.visible');
  });
});