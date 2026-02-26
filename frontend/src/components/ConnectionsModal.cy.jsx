import React from 'react'
import ConnectionsModal from '../../src/components/ConnectionsModal'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../src/context/AuthContext'

describe('<ConnectionsModal />', () => {
  const profileId = 'test-uuid-123'

  beforeEach(() => {
    // Interceptores de segurança
    cy.intercept('GET', '**/api/notifications/**', { statusCode: 200, body: [] })
    cy.intercept('GET', '**/api/accounts/profile/**', { 
      statusCode: 200, 
      body: { id: 'me-123', username: 'tester' } 
    })

    // Mocks das conexões
    cy.intercept('GET', `**/accounts/profiles/${profileId}/connections/?type=followers`, {
      body: [
        { profile_id: '1', username: 'follower_1', display_name: 'Follower One' }
      ]
    }).as('getFollowers')

    cy.intercept('GET', `**/accounts/profiles/${profileId}/connections/?type=following`, {
      body: [
        { profile_id: '2', username: 'following_1', display_name: 'Following One' }
      ]
    }).as('getFollowing')
  })

  // A ORDEM AQUI É CRUCIAL: MemoryRouter tem de envolver o AuthProvider
  const mountWithContext = (props) => {
    cy.mount(
      <MemoryRouter>
        <AuthProvider>
          <div className="bg-[#0F1419] h-screen">
            <ConnectionsModal {...props} />
          </div>
        </AuthProvider>
      </MemoryRouter>
    )
  }

  it('deve abrir e mostrar a lista de seguidores por padrão', () => {
    mountWithContext({ 
      isOpen: true, 
      profileId: profileId, 
      initialTab: 'followers', 
      onClose: cy.stub().as('onClose') 
    })

    cy.wait('@getFollowers')
    cy.contains('Follower One').should('be.visible')
  })

  it('deve alternar entre as abas e carregar novos dados', () => {
    mountWithContext({ 
      isOpen: true, 
      profileId: profileId, 
      initialTab: 'followers', 
      onClose: () => {} 
    })

    cy.wait('@getFollowers')
    
    // Clica especificamente no botão da aba Following
    cy.get('button').contains('Following').click()
    cy.wait('@getFollowing')
    
    cy.contains('Following One').should('be.visible')
  })

  it('deve mostrar mensagem de lista vazia quando não houver conexões', () => {
    // Sobrescreve o intercept para este teste específico
    cy.intercept('GET', `**/accounts/profiles/${profileId}/connections/?type=followers`, { 
      body: [] 
    }).as('getEmpty')
    
    mountWithContext({ 
      isOpen: true, 
      profileId: profileId, 
      initialTab: 'followers', 
      onClose: () => {} 
    })

    cy.wait('@getEmpty')
    cy.contains('No connections found in this list.').should('be.visible')
  })
})