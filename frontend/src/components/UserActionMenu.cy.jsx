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

 it('Quando isOwnPost=true deve mostrar "Deletar Post" e não mostrar Bloquear', () => {
    cy.mount(
      <>
        <ToastContainer theme="dark" position="bottom-center" />
        <UserActionMenu targetProfile={targetProfile} isOwnPost={true} />
      </>
    );

    cy.get('button[type="button"]').click();
    // Ajustado para 'Deletar' conforme a nova UI
    cy.contains('Deletar Post').should('be.visible');
    cy.contains(/Bloquear @/i).should('not.exist');
  });

  it('Deve mostrar fluxo de confirmação ao clicar em Deletar e permitir cancelar', () => {
    cy.mount(
      <>
        <ToastContainer theme="dark" position="bottom-center" />
        <UserActionMenu targetProfile={targetProfile} isOwnPost={true} />
      </>
    );

    cy.get('button[type="button"]').click();
    
    // 1. Primeiro clique em Deletar
    cy.contains('Deletar Post').click();

    // 2. Deve aparecer o botão de confirmação e o cancelar
    cy.contains('CONFIRMAR DELETAR?').should('be.visible');
    cy.contains('Cancelar').should('be.visible');

    // 3. Clica em cancelar
    cy.contains('Cancelar').click();

    // 4. Deve voltar ao estado original ou fechar (conforme o useEffect do seu isOpen)
    cy.contains('Deletar Post').should('be.visible');
    cy.contains('CONFIRMAR DELETAR?').should('not.exist');
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
  it('Deve mostrar fluxo de confirmação ao clicar em Deletar e permitir cancelar', () => {
    cy.mount(
      <>
        <ToastContainer theme="dark" position="bottom-center" />
        <UserActionMenu targetProfile={targetProfile} isOwnPost={true} />
      </>
    );

    // 1. Abre o menu
    cy.get('button[type="button"]').click();
    
    // 2. Clica em Deletar pela primeira vez
    cy.contains('Deletar Post').click();

    // 3. VALIDAÇÃO: Devem aparecer as novas opções e sumir o texto antigo
    cy.contains('CONFIRMAR DELETAR?').should('be.visible');
    cy.contains('Cancelar').should('be.visible');
    cy.contains('Deletar Post').should('not.exist');

    // 4. TESTE DO CANCELAR: Clica em cancelar e verifica se resetou
    cy.contains('Cancelar').click();
    cy.contains('Deletar Post').should('be.visible');
    cy.contains('CONFIRMAR DELETAR?').should('not.exist');
  });

  it('Deve executar a deleção real após confirmar no segundo clique', () => {
    const postId = 55;
    const onActionComplete = cy.spy().as('onActionComplete');

    // Intercepta a chamada de DELETE que criamos no Django
    cy.intercept('DELETE', `**/accounts/posts/${postId}/`, {
      statusCode: 204,
    }).as('deleteReq');

    cy.mount(
      <>
        <ToastContainer theme="dark" position="bottom-center" />
        <UserActionMenu 
          targetProfile={targetProfile} 
          postId={postId} 
          isOwnPost={true} 
          onActionComplete={onActionComplete}
        />
      </>
    );

    cy.get('button[type="button"]').click();
    cy.contains('Deletar Post').click();
    
    // Clica no botão de confirmação (o segundo clique)
    cy.contains('CONFIRMAR DELETAR?').click();

    // Verifica se a API foi chamada e o toast apareceu
    cy.wait('@deleteReq');
    cy.contains('Post eliminado.').should('be.visible');
    cy.get('@onActionComplete').should('have.been.calledWith', postId);
  });
});
