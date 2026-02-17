import React from 'react'
import PublicProfile from './PublicProfile'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
// Importamos o default (que é o contexto) e o useAuth (para garantir que o componente o encontra)
import AuthContext, { useAuth } from '../context/AuthContext' 

describe('<PublicProfile /> - Teste de Componente Isolado', () => {
  
  const mountComponent = (id, currentUser = { id: 'meu-id-123' }) => {
    cy.mount(
      // Usamos o AuthContext que importámos como default
      <AuthContext.Provider value={{ user: currentUser, loading: false }}>
        <MemoryRouter initialEntries={[`/profile/${id}`]}>
          <Routes>
            <Route path="/profile/:id" element={<PublicProfile />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )
  }

  it('Deve mostrar a mensagem de proteção quando o perfil for restrito', () => {
    cy.intercept('GET', `**/accounts/profiles/user-privado/`, {
      statusCode: 200,
      body: {
        id: 'user-privado-uuid',
        username: 'privado',
        display_name: 'Perfil Fechado',
        is_restricted: true,
        following_count: 10,
        followers_count: 50,
        posts: []
      }
    }).as('getProfile')

    mountComponent('user-privado')

    cy.contains('These posts are protected').should('be.visible')
    cy.contains('10').should('be.visible')
    cy.contains('50').should('be.visible')
  })

  it('Deve renderizar os POSTS quando o perfil for aberto', () => {
    cy.intercept('GET', `**/accounts/profiles/user-publico/`, {
      statusCode: 200,
      body: {
        id: 'user-publico-uuid',
        username: 'publico',
        display_name: 'Perfil Aberto',
        is_restricted: false,
        posts: [
          {
            id: 1,
            content: 'Post de Teste Cypress',
            moderation_status: 'APPROVED',
            created_at: new Date().toISOString()
          }
        ]
      }
    }).as('getProfile')

    mountComponent('user-publico')

    cy.contains('Post de Teste Cypress').should('be.visible')
    cy.get('button').contains('Posts').should('be.visible')
  })

  it('Deve mostrar erro 404 quando o usuário não existe', () => {
    cy.intercept('GET', '**/accounts/profiles/nao-existe/', {
      statusCode: 404
    })

    mountComponent('nao-existe')
    cy.contains('User not found').should('be.visible')
  })
})