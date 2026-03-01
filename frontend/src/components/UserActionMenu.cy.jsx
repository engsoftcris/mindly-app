import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import UserActionMenu from './UserActionMenu'
import api from '../api/axios'
import { toast } from 'react-toastify'

describe('<UserActionMenu />', () => {
  const mountMenu = ({
  targetProfile = { id: 10, user_id: 999, username: 'alice' },
  currentUserId = 'meu-id-123',
  postId = 99,
  isOwnPost = false,
  onActionComplete = cy.stub().as('onActionComplete'),
} = {}) => {
  cy.mount(
    <MemoryRouter initialEntries={['/']}>
      <div data-cy="parent" onClick={cy.stub().as('parentClick')}>
        <UserActionMenu
          targetProfile={targetProfile}
          currentUserId={String(currentUserId)}
          postId={postId}
          isOwnPost={isOwnPost}
          onActionComplete={onActionComplete}
        />
      </div>
    </MemoryRouter>
  )
}

  const stubPostResolve = (payload) =>
    cy.get('@apiPost').then((stub) => stub.resolves(payload))

  const stubPostReject = (err) =>
    cy.get('@apiPost').then((stub) => stub.rejects(err))

  const stubDeleteResolve = (payload) =>
    cy.get('@apiDelete').then((stub) => stub.resolves(payload))

  const stubDeleteReject = (err) =>
    cy.get('@apiDelete').then((stub) => stub.rejects(err))

  beforeEach(() => {
    cy.stub(api, 'post').as('apiPost')
    cy.stub(api, 'delete').as('apiDelete')
    cy.stub(toast, 'success').as('toastSuccess')
    cy.stub(toast, 'error').as('toastError')
  })

  it('abre e fecha o menu pelo trigger', () => {
    mountMenu()

    cy.get('[data-cy="user-action-menu-panel"]').should('not.exist')

    cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true })
    cy.get('[data-cy="user-action-menu-panel"]').should('exist')

    cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true })
    cy.get('[data-cy="user-action-menu-panel"]').should('not.exist')
  })

  it('fecha o menu ao clicar fora (mousedown no document)', () => {
    mountMenu()

    cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true })
    cy.get('[data-cy="user-action-menu-panel"]').should('exist')

    // dispara exatamente o evento que seu useEffect escuta
    cy.document().trigger('mousedown', { clientX: 1, clientY: 1, force: true })

    cy.get('[data-cy="user-action-menu-panel"]').should('not.exist')
  })

  it('não propaga clique para o pai (stopPropagation)', () => {
    mountMenu()

    cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true })
    cy.get('@parentClick').should('not.have.been.called')
  })

  it('quando NÃO é dono do post: bloqueia com sucesso', () => {
  const targetProfile = { id: 55, user_id: 55, username: 'bob', is_blocked: false }
  const onActionComplete = cy.stub().as('onActionComplete')

  stubPostResolve({ data: { ok: true } })
  mountMenu({ targetProfile, currentUserId: 'meu-id-123', isOwnPost: false, onActionComplete })

  cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true })
  cy.get('[data-cy="user-action-block"]').should('exist').click({ force: true })

  cy.get('@apiPost').should('have.been.calledOnceWithExactly', '/accounts/profiles/55/block/')
  cy.get('@toastSuccess').should('have.been.calledOnce')
  cy.get('@onActionComplete').should('have.been.calledOnceWithExactly', 55) // seu componente passa profileId
  cy.get('[data-cy="user-action-menu-panel"]').should('not.exist')
})

  it('quando NÃO é dono do post: erro no block mostra toast.error', () => {
  const targetProfile = { id: 55, user_id: 55, username: 'bob', is_blocked: false }
  stubPostReject(new Error('fail'))

  mountMenu({ targetProfile, currentUserId: 'meu-id-123', isOwnPost: false })

  cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true })
  cy.get('[data-cy="user-action-block"]').click({ force: true })

  cy.get('@toastError').should('have.been.calledOnce')
})

  it('quando é dono do post: primeiro clique pede confirmação (não deleta ainda)', () => {
    stubDeleteResolve({ data: { ok: true } })

    mountMenu({ isOwnPost: true, postId: 99 })

    cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true })

    cy.get('[data-cy="user-action-delete"]').click({ force: true })

    cy.get('@apiDelete').should('not.have.been.called')
    cy.get('[data-cy="user-action-confirm-delete"]').should('exist')
    cy.get('[data-cy="user-action-cancel-delete"]').should('exist')
  })

  it('quando é dono do post: cancelar remove confirmação', () => {
    mountMenu({ isOwnPost: true, postId: 99 })

    cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true })
    cy.get('[data-cy="user-action-delete"]').click({ force: true })

    cy.get('[data-cy="user-action-cancel-delete"]').click({ force: true })

    cy.get('[data-cy="user-action-delete"]').should('exist')
    cy.get('[data-cy="user-action-confirm-delete"]').should('not.exist')
  })

  it('quando é dono do post: confirma delete no segundo clique e chama callback', () => {
    const onActionComplete = cy.stub().as('onActionComplete')
    stubDeleteResolve({ data: { ok: true } })

    mountMenu({ isOwnPost: true, postId: 777, onActionComplete })

    cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true })

    cy.get('[data-cy="user-action-delete"]').click({ force: true })
    cy.get('[data-cy="user-action-confirm-delete"]').should('exist')

    cy.get('[data-cy="user-action-confirm-delete"]').click({ force: true })

    cy.get('@apiDelete').should(
      'have.been.calledOnceWithExactly',
      '/accounts/posts/777/'
    )

    cy.get('@toastSuccess').should('have.been.calledOnce')
    cy.get('@onActionComplete').should('have.been.calledOnceWithExactly', 777)
    cy.get('[data-cy="user-action-menu-panel"]').should('not.exist')
  })

  it('quando é dono do post: erro no delete mostra toast.error', () => {
    stubDeleteReject(new Error('fail'))

    mountMenu({ isOwnPost: true, postId: 777 })

    cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true })
    cy.get('[data-cy="user-action-delete"]').click({ force: true })
    cy.get('[data-cy="user-action-confirm-delete"]').click({ force: true })

    cy.get('@toastError').should('have.been.calledOnce')
  })
})
