import React from 'react'
import PublicProfile from './PublicProfile'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

describe('<PublicProfile /> - Teste de Componente Isolado', () => {
  
  // Função auxiliar para montar o componente com o contexto do Router
  const mountComponent = (id) => {
    cy.mount(
      <MemoryRouter initialEntries={[`/profile/${id}`]}>
        <Routes>
          <Route path="/profile/:id" element={<PublicProfile />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('Deve mostrar o CADEADO quando o perfil for restrito', () => {
    // Mock direto da chamada que o componente faz
    cy.intercept('GET', '**/accounts/profiles/user-privado/', {
      statusCode: 200,
      body: {
        username: 'privado',
        display_name: 'Perfil Fechado',
        is_restricted: true, // A trava que queremos testar
        profile_picture: 'https://via.placeholder.com/150',
        posts: []
      }
    }).as('getProfile')

    mountComponent('user-privado')

    // Valida se o componente reagiu corretamente ao is_restricted
    cy.contains('These posts are protected').should('be.visible')
    cy.get('button').contains('Follow').should('be.visible')
    cy.get('svg').should('exist') // O ícone do cadeado
    cy.get('.divide-y').should('not.exist') // A lista de posts não deve ser montada
  })

  it('Deve renderizar os POSTS quando o perfil for aberto', () => {
    cy.intercept('GET', '**/accounts/profiles/user-publico/', {
      statusCode: 200,
      body: {
        username: 'publico',
        display_name: 'Perfil Aberto',
        is_restricted: false,
        posts: [
          {
            id: 1,
            content: 'Post Visível!',
            moderation_status: 'APPROVED',
            created_at: new Date().toISOString()
          }
        ]
      }
    }).as('getProfile')

    mountComponent('user-publico')

    cy.contains('Post Visível!').should('be.visible')
    cy.get('.divide-y').should('exist')
    cy.contains('These posts are protected').should('not.exist')
  })

  it('Deve mostrar erro 404 quando o usuário não existe', () => {
    cy.intercept('GET', '**/accounts/profiles/nao-existe/', {
      statusCode: 404
    })

    mountComponent('nao-existe')
    cy.contains('User not found').should('be.visible')
  })
})