import React from 'react'
import Navbar from './Navbar'
import { BrowserRouter } from 'react-router-dom'
import AuthContext from '../context/AuthContext'

describe('<Navbar />', () => {
  const mountNavbar = (userValue) => {
    const logoutSpy = cy.spy().as('logoutSpy')

    // Mock da chamada de API para notificações
    cy.intercept('GET', '**/notifications/', {
      body: [
        { id: 1, is_read: false },
        { id: 2, is_read: true },
        { id: 3, is_read: false }
      ]
    }).as('getNotifications')

    cy.mount(
      <BrowserRouter>
        <AuthContext.Provider
          value={{
            user: userValue,
            logout: logoutSpy,
            loading: false,
          }}
        >
          <Navbar />
        </AuthContext.Provider>
      </BrowserRouter>
    )
  }

  it('deve mostrar apenas o primeiro nome quando logado', () => {
    mountNavbar({
      id: 'uuid-123',
      display_name: 'Cristiano Tobias',
      username: 'cristiano40',
      profile_picture: null,
    })

    cy.get('[data-cy="navbar-user-display-name"]')
      .should('exist')
      .should('contain', 'Cristiano')
      .should('not.contain', 'Tobias')
  })

  // NOVO TESTE: Validação do Link Dinâmico do Perfil
  it('deve apontar o link de perfil para o ID correto do usuário', () => {
    const userId = 'user-unique-id-999';
    mountNavbar({
      id: userId,
      username: 'cristiano',
      display_name: 'Cristiano Tobias',
    })

    // Verifica se o atributo 'href' contém o ID do usuário
    cy.get('[data-cy="navbar-profile-link"]')
      .should('have.attr', 'href', `/profile/${userId}`)
  })

  // NOVO TESTE: Validação do Badge de Notificações
  it('deve exibir o badge com o número correto de notificações não lidas', () => {
    mountNavbar({
      id: '1',
      username: 'cristiano',
    })

    // Aguarda a chamada da API simulada no intercept
    cy.wait('@getNotifications')

    // No nosso mock acima, temos 2 notificações is_read: false
    cy.get('[data-cy="navbar-notifications-badge"]')
      .should('be.visible')
      .and('contain', '2')
  })

  it('deve disparar logout ao clicar no botão Sair', () => {
    mountNavbar({
      id: '1',
      username: 'cristiano',
      display_name: 'Cristiano Tobias',
    })

    cy.get('[data-cy="navbar-logout-button"]').click()
    cy.get('@logoutSpy').should('have.been.calledOnce')
  })

  it('deve renderizar links Home e Perfil quando logado', () => {
    mountNavbar({
      id: '1',
      username: 'cristiano',
      display_name: 'Cristiano Tobias',
    })

    cy.get('[data-cy="navbar-home-link"]').should('be.visible')
    cy.get('[data-cy="navbar-profile-link"]').should('be.visible')
  })

  it('deve mostrar o link "Entrar" quando user é null', () => {
    mountNavbar(null)
    cy.get('[data-cy="navbar-login-link"]').should('be.visible').and('contain', 'Entrar')
    cy.get('[data-cy="navbar-user-section"]').should('not.exist')
  })
})