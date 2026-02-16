import React from 'react'
import PublicProfile from './PublicProfile'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

describe('<PublicProfile /> - Teste de Componente Isolado', () => {
  
  const mountComponent = (id) => {
    cy.mount(
      <MemoryRouter initialEntries={[`/profile/${id}`]}>
        <Routes>
          <Route path="/profile/:id" element={<PublicProfile />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('Deve mostrar a mensagem de proteção quando o perfil for restrito', () => {
    cy.intercept('GET', '**/accounts/profiles/user-privado/', {
      statusCode: 200,
      body: {
        username: 'privado',
        display_name: 'Perfil Fechado',
        is_restricted: true,
        profile_picture: null,
        bio: 'Minha bio privada',
        following_count: 10,
        followers_count: 50,
        posts: []
      }
    }).as('getProfile')

    mountComponent('user-privado')

    // 1. Valida se a mensagem de restrição aparece
    cy.contains('These posts are protected').should('be.visible')
    
    // 2. Valida se os contadores que adicionamos agora aparecem
    cy.contains('10').should('be.visible')
    cy.contains('Following').should('be.visible')
    cy.contains('50').should('be.visible')
    cy.contains('Followers').should('be.visible')

    // 3. Valida que a lista de posts (divide-y) NÃO foi renderizada
    cy.get('.divide-y').should('not.exist')
  })

  it('Deve renderizar os POSTS e as TABS quando o perfil for aberto', () => {
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
            media_url: null,
            moderation_status: 'APPROVED',
            created_at: new Date().toISOString()
          }
        ]
      }
    }).as('getProfile')

    mountComponent('user-publico')

    // 1. Valida o conteúdo do post
    cy.contains('Post Visível!').should('be.visible')
    
    // 2. Valida se as abas de navegação estão lá. 
    // Como você usou capitalize no CSS, o texto no DOM é 'photos' e 'videos'
    cy.get('button').contains('photos', { matchCase: false }).should('be.visible')
    cy.get('button').contains('videos', { matchCase: false }).should('be.visible')
    cy.get('button').contains('Posts').should('be.visible') // Aba 'all' vira 'Posts' no seu código
    
    // 3. Valida a estrutura
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