import React from 'react';
import LoadingScreen from '../../src/components/LoadingScreen';

describe('<LoadingScreen /> - Visual & Animações', () => {
  // TESTE 1: Foco em Layout e Identidade
  it('deve exibir a marca "Mindly" centralizada com fundo preto', () => {
    cy.mount(<LoadingScreen />);

    // Verifica o container principal via data-cy
    cy.getByData('loading-screen')
      .should('have.class', 'bg-black')
      .and('have.css', 'display', 'flex')
      .and('have.css', 'align-items', 'center');

    // Verifica o texto da marca
    cy.getByData('loading-brand')
      .should('be.visible')
      .and('contain', 'Mindly')
      .and('have.class', 'text-4xl');
  });

  // TESTE 2: Foco em UX e Feedback Visual
  it('deve possuir as classes de animação ativas para indicar carregamento', () => {
    cy.mount(<LoadingScreen />);

    // 1. Verifica a pulsação no Título (UX: Indica que o app está "vivo")
    cy.getByData('loading-brand').should('have.class', 'animate-pulse');

    // 2. Verifica o Spinner de progresso (UX: Indica processamento)
    cy.getByData('loading-spinner')
      .should('be.visible')
      .and('have.class', 'animate-spin')
      .and('have.class', 'border-blue-500')
      .and('have.class', 'rounded-full');

    // Verifica as bordas para o efeito visual de "hélice"
    cy.getByData('loading-spinner')
      .should('have.class', 'border-t-2')
      .and('have.class', 'border-b-2');
  });
});
