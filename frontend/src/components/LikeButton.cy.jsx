import React from 'react'
import LikeButton from './LikeButton'

describe('<LikeButton />', () => {
  it('deve exibir a contagem inicial e a cor cinza quando não curtido', () => {
    const post = { id: 1, is_liked: false, likes_count: 10 }
    
    cy.mount(<LikeButton post={post} onLikeToggle={cy.stub()} />)
    
    // Verifica o número
    cy.get('span').should('contain', '10')
    // Verifica se a classe cinza está presente
    cy.get('button').should('have.class', 'text-gray-500')
  })

  it('deve disparar a requisição e chamar onLikeToggle ao clicar', () => {
    const post = { id: 99, is_liked: false, likes_count: 0 }
    const onLikeToggleSpy = cy.spy().as('likeToggleSpy')

    cy.intercept('POST', '**/api/posts/99/like/', {
      statusCode: 200,
      body: { is_liked: true, likes_count: 1 }
    }).as('likeRequest')

    cy.mount(<LikeButton post={post} onLikeToggle={onLikeToggleSpy} />)

    // Clicamos e apenas esperamos a requisição terminar
    cy.get('button').click()
    
    cy.wait('@likeRequest').then((interception) => {
      // Validamos se a requisição foi feita corretamente
      expect(interception.response.statusCode).to.eq(200)
    })
    
    // Validamos se a função que atualiza a tela foi chamada
    cy.get('@likeToggleSpy').should('have.been.calledWith', 99, true, 1)
  })




})