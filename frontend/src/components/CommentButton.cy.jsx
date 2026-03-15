import React from 'react';
import CommentButton from './CommentButton';

describe('<CommentButton />', () => {
  it('renderiza corretamente sem contador quando count = 0', () => {
    cy.mount(
      <CommentButton count={0} hasCommented={false} onClick={() => {}} />
    );

    // Usando nosso comando estável
    cy.getByData('comment-button').should('be.visible');
    // Verifica se o contador está vazio de forma explícita
    cy.getByData('comment-count').should('be.empty');
    cy.getByData('comment-button').should('have.class', 'text-gray-500');
  });

  it('mostra o contador quando count > 0', () => {
    cy.mount(
      <CommentButton count={5} hasCommented={false} onClick={() => {}} />
    );

    cy.getByData('comment-count').should('have.text', '5');
  });

  it('mostra estado ativo (azul) quando hasCommented=true', () => {
    cy.mount(
      <CommentButton count={3} hasCommented={true} onClick={() => {}} />
    );

    cy.getByData('comment-button')
      .should('have.class', 'text-blue-500')
      .and('not.have.class', 'text-gray-500');
  });

  it('chama onClick quando clicado e garante estabilidade da ação', () => {
    const onClickSpy = cy.spy().as('onClickSpy');

    cy.mount(
      <CommentButton count={1} hasCommented={false} onClick={onClickSpy} />
    );

    // .should('be.visible') garante que o botão não está escondido por outro elemento no momento do clique
    cy.getByData('comment-button').should('be.visible').click();

    cy.get('@onClickSpy').should('have.been.calledOnce');
  });

  it('não propaga o clique para o elemento pai (vital para cards de post)', () => {
    const parentSpy = cy.spy().as('parentSpy');
    const buttonSpy = cy.spy().as('buttonSpy');

    cy.mount(
      <div data-cy="post-card-container" onClick={parentSpy}>
        <CommentButton count={1} hasCommented={false} onClick={buttonSpy} />
      </div>
    );

    cy.getByData('comment-button').click();

    cy.get('@buttonSpy').should('have.been.calledOnce');
    cy.get('@parentSpy').should('not.have.been.called');
  });
});
