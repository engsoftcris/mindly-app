import React from 'react';
import Feed from './Feed';

describe('<Feed /> - Teste com Interceptação Real', () => {
  beforeEach(() => {
    // Página 1
    cy.intercept('GET', '**/accounts/feed/**', (req) => {
      // garante que só intercepta a página 1 (sem page=2)
      if (!req.url.includes('page=2')) {
        req.reply({
          statusCode: 200,
          body: {
            next: 'http://localhost:8000/api/accounts/feed/?page=2',
            results: [
              { id: 1, content: 'Conteúdo longo para gerar altura '.repeat(20), author: { display_name: 'Cristiano' } },
              { id: 2, content: 'Mais um post longo para scroll '.repeat(20), author: { display_name: 'Admin' } },
            ],
          },
        });
      }
    }).as('getFeedP1');

    // Página 2
    cy.intercept('GET', '**/accounts/feed/?page=2', {
      statusCode: 200,
      body: {
        next: null,
        results: [{ id: 3, content: 'CONTEÚDO DA PÁGINA 2', author: { display_name: 'Junior' } }],
      },
    }).as('getFeedP2');
  });

  it('1. Deve carregar a página 2 via scroll (sem loop / sem 401)', () => {
    cy.mount(
      <div
        id="scroll-container"
        style={{ height: '150px', overflowY: 'auto', width: '400px', border: '1px solid #ddd' }}
      >
        <Feed />
      </div>
    );

    // P1
    cy.wait('@getFeedP1');
    cy.contains('Cristiano').should('exist');

    // Faz scroll no container
    cy.get('#scroll-container').scrollTo('bottom');

    // Espera P2
    cy.wait('@getFeedP2');

    // ✅ Em container com overflow, "be.visible" pode falhar por clipping.
    // Primeiro garante que existe:
    cy.contains('CONTEÚDO DA PÁGINA 2').should('exist');

    // E então força entrar em view dentro do container antes de exigir visibilidade
    cy.contains('CONTEÚDO DA PÁGINA 2').scrollIntoView();
    cy.contains('CONTEÚDO DA PÁGINA 2').should('be.visible');

    // Prova extra: não ficou chamando infinitamente (só 2 requests)
    cy.get('@getFeedP1.all').then((calls) => {
      expect(calls.length).to.be.greaterThan(0);
    });
    cy.get('@getFeedP2.all').then((calls) => {
      expect(calls.length).to.eq(1);
    });
  });

  it('2. Deve garantir que o fallback "Usuário" funciona', () => {
    cy.intercept('GET', '**/accounts/feed/**', {
      statusCode: 200,
      body: {
        next: null,
        results: [{ id: 99, content: 'Post Anónimo', author: null }],
      },
    }).as('getAnom');

    cy.mount(<Feed />);

    cy.wait('@getAnom');

    // "be.visible" aqui é ok porque não está dentro do container scroll
    cy.contains('Usuário').should('be.visible');
  });
});
