// src/components/UserActionMenu.cy.jsx
import React from 'react';
import UserActionMenu from './UserActionMenu';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

describe('<UserActionMenu />', () => {
  const targetProfile = { id: 'uuid-123', username: 'johndoe' };

  // Helper para não repetir código em todos os ITs
  const mountComponent = (props) => {
    return cy.mount(
      <MemoryRouter>
        <ToastContainer theme="dark" position="bottom-center" />
        <UserActionMenu {...props} />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    Cypress.on('uncaught:exception', () => false);
  });

  it('Deve renderizar o botão (3 pontinhos) e abrir/fechar o menu ao clicar', () => {
    mountComponent({ targetProfile, isOwnPost: false });

    cy.get('button[type="button"]').should('exist').click();
    cy.contains(`Bloquear @${targetProfile.username}`).should('be.visible');

    cy.get('button[type="button"]').click();
    cy.contains(`Bloquear @${targetProfile.username}`).should('not.exist');
  });

  it('Deve fechar ao clicar fora (click outside)', () => {
    cy.mount(
      <MemoryRouter>
        <div style={{ padding: 40 }}>
          <ToastContainer theme="dark" position="bottom-center" />
          <UserActionMenu targetProfile={targetProfile} isOwnPost={false} />
          <div data-cy="outside">fora</div>
        </div>
      </MemoryRouter>
    );

    cy.get('button[type="button"]').click();
    cy.get('[data-cy="outside"]').click('center');
    cy.contains(`Bloquear @${targetProfile.username}`).should('not.exist');
  });

  it('Quando isOwnPost=true deve mostrar "Deletar Post" e não mostrar Bloquear', () => {
    mountComponent({ targetProfile, isOwnPost: true });
    cy.get('button[type="button"]').click();
    cy.contains('Deletar Post').should('be.visible');
    cy.contains(/Bloquear @/i).should('not.exist');
  });

  it('Deve mostrar fluxo de confirmação ao clicar em Deletar e permitir cancelar', () => {
    mountComponent({ targetProfile, isOwnPost: true });
    cy.get('button[type="button"]').click();
    cy.contains('Deletar Post').click();
    cy.contains('CONFIRMAR DELETAR?').should('be.visible');
    cy.contains('Cancelar').click();
    cy.contains('Deletar Post').should('be.visible');
  });

  it('Deve mostrar toast de erro se o POST falhar', () => {
    cy.intercept('POST', `**/accounts/profiles/${targetProfile.id}/block/`, {
      statusCode: 500,
      body: { error: 'fail' },
    }).as('blockFail');

    mountComponent({ targetProfile, isOwnPost: false });
    cy.get('button[type="button"]').click();
    cy.contains(`Bloquear @${targetProfile.username}`).click();
    cy.wait('@blockFail');
    cy.contains('Erro ao bloquear.').should('be.visible');
  });

  it('Não deve chamar API se não houver profileId', () => {
    mountComponent({ targetProfile: { username: 'semid' }, isOwnPost: false });
    cy.get('button[type="button"]').click();
    cy.contains(/Bloquear @/i).click();
    cy.contains(/bloqueado/i).should('not.exist');
  });

  it('Deve executar a deleção real após confirmar no segundo clique', () => {
    const postId = 55;
    const onActionComplete = cy.spy().as('onActionComplete');
    cy.intercept('DELETE', `**/accounts/posts/${postId}/`, { statusCode: 204 }).as('deleteReq');

    mountComponent({ targetProfile, postId, isOwnPost: true, onActionComplete });
    cy.get('button[type="button"]').click();
    cy.contains('Deletar Post').click();
    cy.contains('CONFIRMAR DELETAR?').click();
    cy.wait('@deleteReq');
    cy.contains('Post eliminado.').should('be.visible');
    cy.get('@onActionComplete').should('have.been.calledWith', postId);
  });

  it('Deve redirecionar para /feed após o bloqueio com sucesso (BUG-41)', () => {
    cy.intercept('POST', `**/accounts/profiles/${targetProfile.id}/block/`, {
      statusCode: 200,
      body: { message: 'Blocked' },
    }).as('blockRequest');

    cy.mount(
      <MemoryRouter initialEntries={['/profile/uuid-123']}>
        <ToastContainer theme="dark" position="bottom-center" />
        <Routes>
          <Route path="/profile/:id" element={<UserActionMenu targetProfile={targetProfile} isOwnPost={false} />} />
          <Route path="/feed" element={<div data-cy="feed-landing">Página do Feed</div>} />
        </Routes>
      </MemoryRouter>
    );

    cy.get('button[type="button"]').click();
    cy.contains(`Bloquear @${targetProfile.username}`).click();
    cy.wait('@blockRequest');
    cy.get('[data-cy="feed-landing"]').should('be.visible');
    cy.contains(`@${targetProfile.username} bloqueado.`).should('be.visible');
  });
});