import PostActions from './PostActions';

describe('<PostActions />', () => {
  const mockPost = { id: '123', content: 'Post para testar data-cy' };

  beforeEach(() => {
    cy.intercept('PATCH', '**/posts/123/', {
      statusCode: 200,
      body: { ...mockPost, content: 'Novo Conteúdo' },
    }).as('updateReq');
    cy.intercept('DELETE', '**/posts/123/', { statusCode: 204 }).as(
      'deleteReq'
    );
  });

  it('deve interagir com o modo de edição usando seletores data-cy', () => {
    cy.mount(
      <PostActions post={mockPost} onUpdate={cy.spy().as('updateSpy')} />
    );

    // Clica no botão de editar
    cy.get('[data-cy="post-edit-btn"]').click();

    // Digita no textarea e salva
    cy.get('[data-cy="post-edit-textarea"]')
      .clear()
      .type('Conteúdo via Cypress');

    cy.get('[data-cy="post-save-btn"]').click();

    cy.wait('@updateReq');
    cy.get('@updateSpy').should('have.been.called');
  });

  it('deve cancelar a edição pelo botão de cancelar', () => {
    cy.mount(<PostActions post={mockPost} />);

    cy.get('[data-cy="post-edit-btn"]').click();
    cy.get('[data-cy="post-cancel-btn"]').click();

    // O textarea deve sumir e o botão de editar voltar
    cy.get('[data-cy="post-edit-textarea"]').should('not.exist');
    cy.get('[data-cy="post-edit-btn"]').should('be.visible');
  });

  it('deve deletar o post ao confirmar o alert', () => {
    const onDeleteSpy = cy.spy().as('deleteSpy');
    cy.on('window:confirm', () => true);

    cy.mount(<PostActions post={mockPost} onDelete={onDeleteSpy} />);

    cy.get('[data-cy="post-delete-btn"]').click();
    cy.wait('@deleteReq');
    cy.get('@deleteSpy').should('have.been.calledWith', '123');
  });
});
