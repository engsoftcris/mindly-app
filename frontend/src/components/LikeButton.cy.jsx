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

    // 1. Adicionamos um delay artificial para garantir que o estado de "loading" apareça
    cy.intercept('POST', '**/api/posts/99/like/', {
      delay: 500, // <--- 500ms é o suficiente para o Cypress detectar o disabled
      statusCode: 200,
      body: { is_liked: true, likes_count: 1 }
    }).as('likeRequest')

    cy.mount(<LikeButton post={post} onLikeToggle={onLikeToggleSpy} />)

    // 2. Clica no botão
    cy.get('button').click()

    // 3. Agora o teste vai passar porque a requisição está "presa" nos 500ms de delay
    cy.get('button').should('be.disabled')

    // 4. Libera a requisição e valida o final do processo
    cy.wait('@likeRequest')
    
    // O botão deve voltar a ficar habilitado após o sucesso
    cy.get('button').should('not.be.disabled')
    
    cy.get('@likeToggleSpy').should('have.been.calledWith', 99, true, 1)
  })
})