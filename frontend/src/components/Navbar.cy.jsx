// frontend/src/components/Navbar.cy.jsx
import React from 'react'
import Navbar from './Navbar'
import { BrowserRouter } from 'react-router-dom'

// IMPORTANTE: AuthContext é export default no seu arquivo
import AuthContext from '../context/AuthContext'

describe('<Navbar />', () => {
  const mountNavbar = (userValue) => {
    const logoutSpy = cy.spy().as('logoutSpy')

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
    display_name: 'Cristiano Tobias',
    username: 'cristiano40',
    profile_picture: null,
  })

  cy.get('[data-cy="navbar-user-display-name"]')
    .should('exist')
    .invoke('text')
    .then((txt) => {
      expect(txt).to.contain('Cristiano')
      expect(txt).to.not.contain('Tobias')
    })

  cy.get('[data-cy="navbar-user-username"]')
    .should('exist')
    .and('contain', '@cristiano40')
})


  it('deve mostrar o username quando display_name está vazio', () => {
    mountNavbar({
      display_name: '',
      username: 'tobias_dev',
      profile_picture: null,
    })

    cy.get('[data-cy="navbar-user-display-name"]')
  .should('exist')
  .and('contain', 'tobias_dev')

  })

  it('deve mostrar o link "Entrar" quando user é null', () => {
    mountNavbar(null)

    cy.get('[data-cy="navbar-login-link"]').should('be.visible').and('contain', 'Entrar')

    cy.get('[data-cy="navbar-logout-button"]').should('not.exist')
    cy.get('[data-cy="navbar-user-section"]').should('not.exist')
  })

  it('deve disparar logout ao clicar no botão Sair', () => {
    mountNavbar({
      username: 'cristiano',
      display_name: 'Cristiano Tobias',
      profile_picture: null,
    })

    cy.get('[data-cy="navbar-logout-button"]').click()
    cy.get('@logoutSpy').should('have.been.calledOnce')
  })

  it('deve renderizar links Home e Perfil quando logado', () => {
    mountNavbar({
      username: 'cristiano',
      display_name: 'Cristiano Tobias',
      profile_picture: null,
    })

    cy.get('[data-cy="navbar-home-link"]').should('be.visible')
    cy.get('[data-cy="navbar-profile-link"]').should('be.visible')
  })
})
