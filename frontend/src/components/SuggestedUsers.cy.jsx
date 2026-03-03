import SuggestedUsers from './SuggestedUsers'
import { BrowserRouter } from 'react-router-dom'

describe('<SuggestedUsers />', () => {
  it('deve exibir a lista de sugestões carregada da API usando data-cy', () => {
    const mockUsers = [
      { id: 10, user: { username: 'cristiano', full_name: 'Cristiano Tobias' } },
      { id: 11, user: { username: 'juliet', full_name: 'Juliet B' } }
    ]

    cy.intercept('GET', '**/accounts/suggested-follows/', {
      body: mockUsers
    }).as('getSuggestions')

    cy.mount(
      <BrowserRouter>
        <SuggestedUsers />
      </BrowserRouter>
    )

    cy.wait('@getSuggestions')

    // 1. Verifica se os cards de sugestão existem
    cy.get('[data-cy="suggested-item"]').should('have.length', 2)

    // 2. Verifica se os nomes estão corretos nos seletores específicos
    cy.get('[data-cy="full-name"]').first().should('have.text', 'Cristiano Tobias')
    cy.get('[data-cy="username"]').last().should('have.text', '@juliet')
    
    // 3. Verifica a quantidade de botões de seguir da forma CORRETA
    cy.get('[data-cy="follow-button"]').should('have.length', 2)
  })

  it('deve remover o usuário da lista ao clicar em seguir', () => {
    cy.intercept('GET', '**/accounts/suggested-follows/', {
      body: [{ id: 10, user: { username: 'cristiano' } }]
    })
    
    cy.intercept('POST', '**/accounts/profiles/10/follow/', {
      statusCode: 200
    }).as('followRequest')

    cy.mount(
      <BrowserRouter>
        <SuggestedUsers />
      </BrowserRouter>
    )

    // Clica no botão de seguir
    cy.get('[data-cy="follow-button"]').click()
    
    // Espera a chamada da API
    cy.wait('@followRequest')

    // O item deve sumir da lista (feedback visual de sucesso)
    cy.get('[data-cy="suggested-item"]').should('not.exist')
  })
})