import React from 'react'
import LoadingScreen from '../../src/components/LoadingScreen'

describe('<LoadingScreen /> - Visual & Animações', () => {
  
  // TESTE 1: Validação de Identidade e Layout
  it('deve exibir a marca "Mindly" centralizada com fundo preto', () => {
    cy.mount(<LoadingScreen />)

    // Verifica se o container principal é um flexbox centralizado
    cy.get('div.min-h-screen')
      .should('have.class', 'bg-black')
      .and('have.css', 'display', 'flex')
      .and('have.css', 'align-items', 'center')
      .and('have.css', 'justify-content', 'center')

    // Verifica o texto da marca
    cy.contains('h1', 'Mindly')
      .should('be.visible')
      .and('have.class', 'text-white')
      .and('have.class', 'text-4xl')
  })

  // TESTE 2: Validação de Feedback Visual (Animations)
  it('deve possuir as classes de animação ativas para indicar carregamento', () => {
    cy.mount(<LoadingScreen />)

    // 1. Verifica a pulsação no Título (UX: Indica que o app está "vivo")
    cy.get('h1').should('have.class', 'animate-pulse')

    // 2. Verifica o Spinner de progresso (UX: Indica processamento)
    cy.get('div.animate-spin')
      .should('be.visible')
      .and('have.class', 'border-blue-500')
      .and('have.class', 'rounded-full')

    // Verifica se o spinner tem as bordas transparentes/coloridas corretas para o efeito visual
    cy.get('div.animate-spin')
      .should('have.class', 'border-t-2')
      .and('have.class', 'border-b-2')
  })
})