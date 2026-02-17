import React from 'react'
import FollowButton from './FollowButton'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

describe('<FollowButton /> - Testes de Componente', () => {
  const profileId = 'uuid-teste-123'

  // Helper para pegar o botão correto e ignorar os botões do Toastify
  const getFollowBtn = () => cy.get('button').not('.Toastify__close-button');

  it('Fluxo Completo: Seguir (201) e Deixar de Seguir (200)', () => {
    cy.intercept('POST', `**/accounts/profiles/${profileId}/follow/`, {
      statusCode: 201,
      body: { message: 'Agora estás a seguir.' },
    }).as('followRequest')

    cy.mount(
      <div className="p-10 bg-[#0F1419]">
        <ToastContainer />
        <FollowButton profileId={profileId} initialIsFollowing={false} />
      </div>
    )

    // Validar estado inicial
    getFollowBtn().should('have.text', 'Seguir').and('have.class', 'bg-white')

    // Seguir
    getFollowBtn().click()
    cy.wait('@followRequest')

    // Validar estado Seguindo
    getFollowBtn().should('have.text', 'Seguindo').and('have.class', 'bg-black')
    cy.contains('Agora estás a seguir.').should('be.visible')

    // Simular Unfollow
    cy.intercept('POST', `**/accounts/profiles/${profileId}/follow/`, {
      statusCode: 200,
      body: { message: 'Deixaste de seguir.' },
    }).as('unfollowRequest')

    getFollowBtn().click()
    cy.wait('@unfollowRequest')

    // Voltar ao estado inicial
    getFollowBtn().should('have.text', 'Seguir').and('have.class', 'bg-white')
  })

  it('Cooldown: Deve manter o estado se a API retornar erro 400 (5 minutos)', () => {
    cy.intercept('POST', `**/accounts/profiles/${profileId}/follow/`, {
      statusCode: 400,
      body: { error: 'Aguarde! Tente novamente em 5m.' },
    }).as('cooldownRequest')

    cy.mount(
      <div className="p-10 bg-[#0F1419]">
        <ToastContainer />
        <FollowButton profileId={profileId} initialIsFollowing={false} />
      </div>
    )

    getFollowBtn().click()
    cy.wait('@cooldownRequest')

    getFollowBtn().should('have.text', 'Seguir').and('not.have.class', 'bg-black')
    cy.contains('Aguarde! Tente novamente em 5m.').should('be.visible')
  })

  it('UI: Deve desativar e mostrar loading durante o processamento', () => {
    cy.intercept('POST', `**/accounts/profiles/${profileId}/follow/`, {
      delay: 500,
      statusCode: 201,
    }).as('delayedRequest')

    cy.mount(
      <div className="p-10 bg-[#0F1419]">
        <FollowButton profileId={profileId} initialIsFollowing={false} />
      </div>
    )

    getFollowBtn().click()
    getFollowBtn().should('have.text', '...').and('be.disabled')
    
    cy.wait('@delayedRequest')
    getFollowBtn().should('have.text', 'Seguindo')
  })
})