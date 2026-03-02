import React from 'react'
import PublicProfile from './PublicProfile'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AuthContext from '../context/AuthContext' 

describe('<PublicProfile /> - Teste de Componente Isolado', () => {
  
  const mountComponent = (id, currentUser = { id: 'meu-id-123' }) => {
    cy.mount(
      <AuthContext.Provider value={{ user: currentUser, loading: false }}>
        <MemoryRouter initialEntries={[`/profile/${id}`]}>
          <Routes>
            <Route path="/profile/:id" element={<PublicProfile />} />
            {/* Rota dummy para testar o clique no Edit */}
            <Route path="/settings" element={<div data-cy="settings-page">Settings Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )
  }

 it('Deve mostrar botão "Edit Profile" e navegar ao ser o DONO do perfil', () => {
  // 1. Defina UM ÚNICO ID para ser o ID do Perfil (o UUID que vai na URL)
  const myProfileId = 'cristiano-profile-uuid-123';

  cy.intercept('GET', `**/accounts/profiles/${myProfileId}/`, {
    statusCode: 200,
    body: {
      id: myProfileId,
      user_id: 123,
      username: 'cristiano',
      display_name: 'Cristiano Tobias',
      is_restricted: false,
      posts: [],
    }
  }).as('getOwnProfile');

  // 2. IMPORTANTE: O segundo parâmetro (currentUser) DEVE ter o mesmo ID que a URL
  // porque o isOwner compara loggedInId === id (da URL)
  mountComponent(myProfileId, { 
    id: myProfileId, // ID do logado igual ao da URL
    username: 'cristiano' 
  });

  cy.wait('@getOwnProfile');

  // Agora o isOwner será TRUE e o botão vai aparecer
  cy.contains('button', 'Edit Profile', { timeout: 10000 }).should('be.visible');
  cy.contains('button', /follow/i).should('not.exist');

  cy.contains('button', 'Edit Profile').click();
  cy.get('[data-cy="settings-page"]').should('exist');
});

  it('Deve mostrar "FollowButton" e "UserActionMenu" ao visitar perfil de OUTRO', () => {
    const otherId = 'outro-usuario-456';
    
    cy.intercept('GET', `**/accounts/profiles/${otherId}/`, {
      statusCode: 200,
      body: {
        id: otherId,
        username: 'joao_silva',
        display_name: 'João Silva',
        is_restricted: false,
        is_following: false, // Aqui garante que deve aparecer "Follow"
        posts: []
      }
    }).as('getOtherProfile')

    mountComponent(otherId, { id: 'meu-id-123' })

    // Aguarda a resposta da API antes de procurar o botão
    cy.wait('@getOtherProfile')

    // 1. Verifica se o botão de Follow aparece (usando Regex para ser mais seguro)
    cy.contains(/follow/i).should('be.visible')
    
    // 2. Verifica se o menu de ações aparece
    cy.get('button').find('svg').should('exist') 

    // 3. Garante que o Edit NÃO está lá
    cy.contains(/edit profile/i).should('not.exist')
  })

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
  })

  it('Deve mostrar erro 404 quando o usuário não existe', () => {
    cy.intercept('GET', '**/accounts/profiles/nao-existe/', {
      statusCode: 404
    })

    mountComponent('nao-existe')
    cy.contains('User not found').should('be.visible')
  })
})