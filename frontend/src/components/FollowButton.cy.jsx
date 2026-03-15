import React from 'react';
import FollowButton from './FollowButton';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

describe('<FollowButton /> - Blindado', () => {
  const profileId = 'uuid-teste-123';

  it('Fluxo Completo: Seguir e Deixar de Seguir', () => {
    cy.intercept('POST', `**/accounts/profiles/${profileId}/follow/`, {
      statusCode: 201,
      body: { message: 'Agora você está seguindo.' },
    }).as('followRequest');

    cy.mount(
      <div className="p-10 bg-[#0F1419]">
        <ToastContainer />
        <FollowButton profileId={profileId} initialIsFollowing={false} />
      </div>
    );

    // Validar estado inicial via data-cy
    cy.getByData('follow-button')
      .should('contain', 'Seguir')
      .and('have.class', 'bg-white');

    // Seguir
    cy.getByData('follow-button').click();
    cy.wait('@followRequest');

    // Validar estado Seguindo
    cy.getByData('follow-button')
      .should('contain', 'Seguindo')
      .and('have.class', 'bg-black');

    // Simular Unfollow
    cy.intercept('POST', `**/accounts/profiles/${profileId}/follow/`, {
      statusCode: 200,
      body: { message: 'Você deixou de seguir.' },
    }).as('unfollowRequest');

    cy.getByData('follow-button').click();
    cy.wait('@unfollowRequest');
    cy.getByData('follow-button').should('contain', 'Seguir');
  });

  it('Cooldown: Deve manter o estado em erro 400', () => {
    cy.intercept('POST', `**/accounts/profiles/${profileId}/follow/`, {
      statusCode: 400,
      body: { error: 'Aguarde! Tente novamente em 5m.' },
    }).as('cooldownRequest');

    cy.mount(
      <div className="p-10 bg-[#0F1419]">
        <ToastContainer />
        <FollowButton profileId={profileId} initialIsFollowing={false} />
      </div>
    );

    cy.getByData('follow-button').click();
    cy.wait('@cooldownRequest');

    // Deve voltar para "Seguir" (rollback do estado otimista)
    cy.getByData('follow-button').should('contain', 'Seguir');
    cy.contains('Aguarde! Tente novamente em 5m.').should('be.visible');
  });

  it('UI: Deve mostrar loading durante o processamento', () => {
    cy.intercept('POST', `**/accounts/profiles/${profileId}/follow/`, {
      delay: 500,
      statusCode: 201,
    }).as('delayedRequest');

    cy.mount(
      <div className="p-10 bg-[#0F1419]">
        <FollowButton profileId={profileId} initialIsFollowing={false} />
      </div>
    );

    cy.getByData('follow-button').click();
    // Verifica o texto de loading e o estado desabilitado
    cy.getByData('follow-button').should('contain', '...').and('be.disabled');

    cy.wait('@delayedRequest');
    cy.getByData('follow-button').should('contain', 'Seguindo');
  });
});
