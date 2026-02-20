import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Notifications from './Notifications';

describe('<Notifications /> - Testes de Componente', () => {
  const mockNotifications = [
    {
      id: 1,
      notification_type: 'LIKE',
      sender_name: 'Cristiano',
      sender_username: 'cristiano_dev',
      is_read: false,
      post_content: 'Meu primeiro post!',
      sender_avatar: null
    },
    {
      id: 2,
      notification_type: 'FOLLOW',
      sender_name: 'Ana',
      sender_username: 'ana_test',
      is_read: true,
      sender_uuid: 'uuid-ana-123',
      sender_avatar: null
    }
  ];

  beforeEach(() => {
    // Intercepta a chamada da API que o useEffect faz ao montar o componente
    cy.intercept('GET', '**/notifications/', mockNotifications).as('getNotifications');
    
    cy.mount(
      <MemoryRouter>
        <Notifications />
      </MemoryRouter>
    );
  });

  it('1. Deve exibir o estado de carregamento e depois a lista', () => {
    // O componente começa com loading: true
    cy.contains('Carregando...').should('be.visible');
    cy.wait('@getNotifications');
    cy.contains('Notificações').should('be.visible');
  });

  it('2. Deve renderizar os ícones corretos para cada tipo de notificação', () => {
    cy.wait('@getNotifications');
    
    // Verifica se o ícone de LIKE (FaHeart - rosa) está presente
    cy.get('svg.text-pink-600').should('exist');
    
    // Verifica se o ícone de FOLLOW (FaUserPlus - azul) está presente
    cy.get('svg.text-blue-500').should('exist');
  });

  it('3. Deve destacar notificações não lidas com o ponto azul', () => {
    cy.wait('@getNotifications');
    
    // A notificação 1 não está lida, deve ter o ponto azul (indicador de nova)
    cy.get('.bg-blue-500.rounded-full').should('be.visible');
    
    // A notificação 1 deve ter a classe de fundo azulado suave
    cy.contains('Cristiano').parents('.cursor-pointer').should('have.class', 'bg-blue-500/5');
  });

  it('4. Deve marcar como lida ao clicar em uma notificação', () => {
    // Intercepta o POST de marcação como lida
    cy.intercept('POST', '**/notifications/1/mark_as_read/', { statusCode: 200 }).as('markAsRead');
    
    cy.wait('@getNotifications');
    
    // Clica na notificação do Cristiano (ID 1)
    cy.contains('Cristiano').click();
    
    cy.wait('@markAsRead');
    
    // Após o clique e o sucesso da API, o ponto azul deve sumir do componente
    cy.get('.bg-blue-500.rounded-full').should('not.exist');
  });

  it('5. Deve exibir o avatar padrão se sender_avatar for null', () => {
    cy.wait('@getNotifications');
    // Verifica se as imagens de avatar estão a usar o fallback do ui-avatars
    cy.get('img[src*="ui-avatars.com/api/"]').should('have.length', 2);
  });
});