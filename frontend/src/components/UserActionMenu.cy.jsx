// src/components/UserActionMenu.cy.jsx
import React from 'react';
import UserActionMenu from './UserActionMenu';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

describe('<UserActionMenu />', () => {
  const targetProfile = { id: 'uuid-123', username: 'johndoe' };

  beforeEach(() => {
    // Opcional: evita falha por erros não relacionados (use com parcimônia)
    Cypress.on('uncaught:exception', () => false);
  });

  it('Deve renderizar o botão (3 pontinhos) e abrir/fechar o menu ao clicar', () => {
    cy.mount(
      <>
        <ToastContainer theme="dark" position="bottom-center" />
        <UserActionMenu targetProfile={targetProfile} isOwnPost={false} />
      </>
    );

    // Botão existe
    cy.get('button[type="button"]').should('exist');

    // Menu fechado inicialmente
    cy.contains(/Bloquear @/i).should('not.exist');
    cy.contains(/Eliminar Post/i).should('not.exist');

    // Abre
    cy.get('button[type="button"]').click();
    cy.contains(`Bloquear @${targetProfile.username}`).should('be.visible');

    // Fecha clicando de novo no botão
    cy.get('button[type="button"]').click();
    cy.contains(`Bloquear @${targetProfile.username}`).should('not.exist');
  });

  it('Deve fechar ao clicar fora (click outside)', () => {
    cy.mount(
      <div style={{ padding: 40 }}>
        <ToastContainer theme="dark" position="bottom-center" />
        <UserActionMenu targetProfile={targetProfile} isOwnPost={false} />
        <div data-cy="outside">fora</div>
      </div>
    );

    cy.get('button[type="button"]').click();
    cy.contains(`Bloquear @${targetProfile.username}`).should('be.visible');

    // clique fora
    cy.get('[data-cy="outside"]').click('center');
    cy.contains(`Bloquear @${targetProfile.username}`).should('not.exist');
  });

  it('Quando isOwnPost=true deve mostrar "Eliminar Post" e não mostrar Bloquear', () => {
    cy.mount(
      <>
        <ToastContainer theme="dark" position="bottom-center" />
        <UserActionMenu targetProfile={targetProfile} isOwnPost={true} />
      </>
    );

    cy.get('button[type="button"]').click();
    cy.contains('Eliminar Post').should('be.visible');
    cy.contains(/Bloquear @/i).should('not.exist');
  });

  it('Deve chamar POST /accounts/profiles/:id/block/, mostrar toast e fechar ao sucesso', () => {
    cy.intercept('POST', `**/accounts/profiles/${targetProfile.id}/block/`, {
      statusCode: 200,
      body: { ok: true },
    }).as('blockReq');

    const onActionComplete = cy.spy().as('onActionComplete');

    cy.mount(
      <>
        <ToastContainer theme="dark" position="bottom-center" />
        <UserActionMenu
          targetProfile={targetProfile}
          isOwnPost={false}
          onActionComplete={onActionComplete}
        />
      </>
    );

    // abre menu e bloqueia
    cy.get('button[type="button"]').click();
    cy.contains(`Bloquear @${targetProfile.username}`).click();

    cy.wait('@blockReq');
    cy.contains(`@${targetProfile.username} bloqueado.`).should('be.visible');

    // menu deve fechar
    cy.contains(`Bloquear @${targetProfile.username}`).should('not.exist');

    // callback deve ser chamado com o profileId
    cy.get('@onActionComplete').should('have.been.calledWith', targetProfile.id);
  });

  it('Deve mostrar toast de erro se o POST falhar', () => {
    cy.intercept('POST', `**/accounts/profiles/${targetProfile.id}/block/`, {
      statusCode: 500,
      body: { error: 'fail' },
    }).as('blockFail');

    cy.mount(
      <>
        <ToastContainer theme="dark" position="bottom-center" />
        <UserActionMenu targetProfile={targetProfile} isOwnPost={false} />
      </>
    );

    cy.get('button[type="button"]').click();
    cy.contains(`Bloquear @${targetProfile.username}`).click();

    cy.wait('@blockFail');
    cy.contains('Erro ao bloquear.').should('be.visible');

    // menu fecha mesmo com erro? (no seu código, só fecha no sucesso)
    cy.contains(`Bloquear @${targetProfile.username}`).should('be.visible');
  });

  it('Não deve chamar API se não houver profileId', () => {
    cy.intercept('POST', '**/block/**', () => {
      throw new Error('Não deveria chamar o endpoint sem profileId');
    });

    cy.mount(
      <>
        <ToastContainer theme="dark" position="bottom-center" />
        <UserActionMenu targetProfile={{ username: 'semid' }} isOwnPost={false} />
      </>
    );

    cy.get('button[type="button"]').click();
    cy.contains(/Bloquear @/i).click();

    // Sem profileId, nada acontece (sem toast de sucesso)
    cy.contains(/bloqueado/i).should('not.exist');
  });
});
