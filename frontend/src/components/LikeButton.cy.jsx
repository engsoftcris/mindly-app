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

  it('deve exibir cor rosa quando o post já vem curtido', () => {
    const post = { id: 1, is_liked: true, likes_count: 5 }
    
    cy.mount(<LikeButton post={post} onLikeToggle={cy.stub()} />)
    
    cy.get('button').should('have.class', 'text-pink-500')
  })

  it('deve disparar a requisição e chamar onLikeToggle ao clicar', () => {
    const post = { id: 99, is_liked: false, likes_count: 0 }
    const onLikeToggleSpy = cy.spy().as('likeToggleSpy')

    // ADICIONE UM DELAY AQUI (ex: 500ms)
    cy.intercept('POST', '**/api/posts/99/like/', {
      delay: 500, // <--- Isso segura a requisição por meio segundo
      statusCode: 200,
      body: { is_liked: true, likes_count: 1 }
    }).as('likeRequest')

    cy.mount(<LikeButton post={post} onLikeToggle={onLikeToggleSpy} />)

    // Clica no botão
    cy.get('button').click()

    // Agora o botão VAI estar desabilitado porque a API está "esperando" os 500ms
    cy.get('button').should('be.disabled')

    // Espera a resposta e valida o callback
    cy.wait('@likeRequest')
    
    // Opcional: validar que ele voltou a ficar habilitado após o wait
    cy.get('button').should('not.be.disabled')
    
    cy.get('@likeToggleSpy').should('have.been.calledWith', 99, true, 1)
  })
})