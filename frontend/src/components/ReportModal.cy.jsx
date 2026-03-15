import React from 'react';
import ReportButton from './ReportModal';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

describe('<ReportButton />', () => {
  const postId = 123;

  beforeEach(() => {
    // Monta o componente com o ToastContainer para podermos ver os alertas
    cy.mount(
      <>
        <ToastContainer />
        <div className="p-10 bg-gray-900">
          <ReportButton
            postId={postId}
            onReportSuccess={cy.spy().as('onSuccess')}
          />
        </div>
      </>
    );
  });

  it('deve abrir o modal ao clicar no botão e mostrar as opções', () => {
    cy.contains('Denunciar').click();
    cy.get('h3').should('contain', 'Denunciar Post');
    cy.get('select').should('be.visible');
    cy.get('select').should('have.value', 'spam');
  });

  it('deve enviar denúncia com sucesso e fechar o modal', () => {
    // 1. Mudamos para capturar qualquer POST que termine em /reports/
    // O '*' antes do reports ajuda se a URL for /api/reports/ ou /reports/
    cy.intercept('POST', '**/reports/**', {
      statusCode: 201,
      body: { message: 'Created' },
    }).as('createReport');

    cy.contains('Denunciar').click();
    cy.get('select').select('hate_speech');

    // 2. Garante que o botão não está desabilitado antes de clicar
    cy.contains('Confirmar Denúncia').should('not.be.disabled').click();

    // 3. Aguarda a chamada
    cy.wait('@createReport');

    // Valida UI
    cy.contains('Obrigado!').should('be.visible');
    cy.get('@onSuccess').should('have.been.calledWith', postId);
    cy.get('h3').should('not.exist');
  });

  it('deve tratar erro 400 (duplicado) e ainda assim esconder o post', () => {
    // Mesma mudança na URL aqui
    cy.intercept('POST', '**/reports/**', {
      statusCode: 400,
      body: { detail: 'Already reported' },
    }).as('duplicateReport');

    cy.contains('Denunciar').click();
    cy.contains('Confirmar Denúncia').click();

    cy.wait('@duplicateReport');

    cy.contains('Já recebemos').should('be.visible');
    cy.get('@onSuccess').should('have.been.calledWith', postId);
    cy.get('h3').should('not.exist');
  });

  it('deve fechar o modal ao clicar em Cancelar', () => {
    cy.contains('Denunciar').click();
    cy.contains('Cancelar').click();
    cy.get('h3').should('not.exist');
  });
});
