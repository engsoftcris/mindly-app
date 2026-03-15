import React from 'react';
import LikeButton from './LikeButton';

describe('<LikeButton /> - Blindado', () => {
  it('deve exibir a contagem inicial e a cor cinza quando não curtido', () => {
    const post = { id: 1, is_liked: false, likes_count: 10 };

    cy.mount(<LikeButton post={post} onLikeToggle={cy.stub()} />);

    // Verifica o número via data-cy
    cy.getByData('likes-count').should('contain', '10');

    // Verifica se o botão não tem a cor de ativo (rosa/vermelho)
    cy.getByData('like-button').should('have.class', 'text-gray-500');
  });

  it('deve disparar a requisição e chamar onLikeToggle ao clicar', () => {
    const post = { id: 99, is_liked: false, likes_count: 0 };
    const onLikeToggleSpy = cy.spy().as('likeToggleSpy');

    cy.intercept('POST', '**/posts/99/like/', {
      statusCode: 200,
      body: {
        is_liked: true,
        likes_count: 1,
      },
    }).as('likeRequest');

    cy.mount(<LikeButton post={post} onLikeToggle={onLikeToggleSpy} />);

    // Clicar no botão específico
    cy.getByData('like-button').click();

    cy.wait('@likeRequest');

    // Validar se o pai foi avisado corretamente para atualizar o feed
    cy.get('@likeToggleSpy')
      .should('have.been.calledOnce')
      .and('have.been.calledWith', 99, true, 1);
  });
});
