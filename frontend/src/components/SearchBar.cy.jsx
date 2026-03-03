import { BrowserRouter } from 'react-router-dom' 
import SearchBar from './SearchBar'


describe('<SearchBar />', () => {
  it('deve permitir digitar e encontrar um usuário usando data-cy', () => {
    // Mock da API de busca
    cy.intercept('GET', '**/accounts/search/**', {
      body: [
        { id: 1, user: { username: 'juliet', full_name: 'Juliet Bennett' } }
      ]
    }).as('getSearch')

    cy.mount(
      <BrowserRouter>
        <SearchBar />
      </BrowserRouter>
    )

    // Usa o data-cy para o input
    cy.get('[data-cy="search-input"]')
      .type('jul')
    
    cy.wait('@getSearch')

    // Verifica o dropdown usando data-cy
    cy.get('[data-cy="search-result-item"]')
      .should('be.visible')
      .and('have.length', 1)

    cy.get('[data-cy="search-result-name"]')
      .should('contain', 'Juliet Bennett')

    cy.get('[data-cy="search-result-username"]')
      .should('contain', '@juliet')
  })
})