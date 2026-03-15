import CommentItem from './CommentItem';
import { mount } from 'cypress/react';
import api from '../api/axios';
import { toast } from 'react-toastify';

const baseComment = (overrides = {}) => ({
  id: 10,
  author: 7,
  author_id: 7,
  author_name: 'cris',
  author_avatar: '',
  content: 'Conteúdo original',
  media_url: null,
  image: null,
  created_at: new Date('2026-02-28T10:00:00Z').toISOString(),
  ...overrides,
});

describe('CommentItem (component)', () => {
  beforeEach(() => {
    // Stubs de toast
    cy.stub(toast, 'success').as('toastSuccess');
    cy.stub(toast, 'info').as('toastInfo');
    cy.stub(toast, 'error').as('toastError');

    // Stubs da API (axios instance)
    cy.stub(api, 'patch').as('apiPatch');
    cy.stub(api, 'delete').as('apiDelete');
  });

  afterEach(() => {
    // Restaura stubs (evita bleed entre testes)
    toast.success.restore();
    toast.info.restore();
    toast.error.restore();
    api.patch.restore();
    api.delete.restore();
  });

  const mountComponent = (props = {}) => {
    const onDeleteSuccess = cy.stub().as('onDeleteSuccess');

    mount(
      <CommentItem
        comment={baseComment()}
        currentUserId={'7'}
        postOwnerId={'7'}
        onDeleteSuccess={onDeleteSuccess}
        {...props}
      />
    );

    // Mantido o trigger para simular o comportamento real do usuário
    cy.getByData('comment-item').trigger('mouseover');
  };

  it('mostra Edit e Delete quando currentUser é o autor (e dono do post)', () => {
    mountComponent({
      comment: baseComment({ author: 7, author_id: 7 }),
      currentUserId: '7',
      postOwnerId: '7',
    });

    cy.getByData('comment-edit').should('exist');
    cy.getByData('comment-delete').should('exist');
  });

  it('mostra apenas Delete (moderation) quando currentUser é dono do post mas não é autor do comentário', () => {
    mountComponent({
      comment: baseComment({ author: 999, author_id: 999 }),
      currentUserId: '7',
      postOwnerId: '7',
    });

    cy.getByData('comment-edit').should('not.exist');
    cy.getByData('comment-delete').should('exist');
    // Validação extra do title que você tinha
    cy.getByData('comment-delete').should(
      'have.attr',
      'title',
      'Remove comment (moderation)'
    );
  });

  it('não mostra Edit nem Delete quando não é autor nem dono do post', () => {
    mountComponent({
      comment: baseComment({ author: 999, author_id: 999 }),
      currentUserId: '7',
      postOwnerId: '123',
    });

    cy.getByData('comment-edit').should('not.exist');
    cy.getByData('comment-delete').should('not.exist');
  });

  it('edita com sucesso: abre editor, PATCH, atualiza conteúdo e fecha', () => {
    const comment = baseComment({ author: 7, author_id: 7, content: 'Antes' });
    api.patch.resolves({ data: { content: 'Depois' } });

    mountComponent({
      comment,
      currentUserId: '7',
      postOwnerId: '7',
    });

    cy.getByData('comment-edit').click({ force: true });

    cy.getByData('comment-edit-input').clear().type('Depois');
    cy.getByData('comment-save').click();

    cy.get('@apiPatch').should('have.been.calledOnce');
    cy.get('@toastSuccess').should(
      'have.been.calledWith',
      'Comentário atualizado!'
    );

    cy.getByData('comment-edit-input').should('not.exist');
    cy.getByData('comment-content').should('contain', 'Depois');
  });

  it('não envia PATCH se tentar salvar vazio (comportamento atual: cancela e reverte)', () => {
    const comment = baseComment({
      author: 7,
      author_id: 7,
      content: 'Texto antigo',
    });

    mountComponent({
      comment,
      currentUserId: '7',
      postOwnerId: '7',
    });

    cy.getByData('comment-edit').click({ force: true });

    cy.getByData('comment-edit-input').clear().type('   ');
    cy.getByData('comment-save').click();

    cy.get('@apiPatch').should('not.have.been.called');
    cy.getByData('comment-edit-input').should('not.exist');
    cy.getByData('comment-content').should('contain', 'Texto antigo');
  });

  it('PATCH falha: mostra toast.error com mensagem do backend', () => {
    const comment = baseComment({ author: 7, author_id: 7, content: 'Antes' });

    api.patch.rejects({
      response: { data: { detail: 'Comentário não pode ficar vazio.' } },
    });

    mountComponent({
      comment,
      currentUserId: '7',
      postOwnerId: '7',
    });

    cy.getByData('comment-edit').click({ force: true });

    cy.getByData('comment-edit-input').clear().type('Novo texto');
    cy.getByData('comment-save').click();

    cy.get('@apiPatch').should('have.been.calledOnce');
    cy.get('@toastError').should(
      'have.been.calledWith',
      'Comentário não pode ficar vazio.'
    );
  });

  it('delete com confirmação: chama api.delete, chama callback e mostra toast', () => {
    const commentId = '321';
    const comment = baseComment({
      id: commentId,
      author: '999',
      author_id: '999',
    });

    api.delete.resolves({ status: 204 });

    mountComponent({
      comment,
      currentUserId: '7',
      postOwnerId: '7',
    });

    cy.getByData('comment-delete').click({ force: true });

    // Aqui usamos o contains para o texto do modal que você definiu
    cy.contains('Remove this comment from your post?').should('be.visible');
    cy.getByData('comment-delete-confirm').click();

    cy.get('@apiDelete').should(
      'have.been.calledWith',
      `/comments/${commentId}/`
    );
    cy.get('@onDeleteSuccess').should('have.been.calledWith', commentId);
    cy.get('@toastInfo').should('have.been.calledWith', 'Comentário removido.');
  });
});
