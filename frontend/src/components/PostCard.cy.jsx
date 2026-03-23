import { BrowserRouter } from 'react-router-dom';
import React from 'react';
import PostCard from './PostCard';

describe('<PostCard />', () => {
  const mockAuthor = {
    id: 'auth-uuid-123',
    username: 'cristiano_dev',
    display_name: 'Cristiano EngSoft',
    profile_picture: null,
  };

  const mockPost = {
    id: 'post-uuid-999',
    content: 'Este é um post de teste para o Cypress!',
    author: mockAuthor,
    media_url: 'https://via.placeholder.com/600',
    likes_count: 10,
    comments_count: 5,
    moderation_status: 'APPROVED',
    created_at: '2026-03-14T10:00:00Z',
  };

  const currentUser = {
    id: 'auth-uuid-123',
    username: 'cristiano_dev',
  };

  const otherUser = {
    id: 'other-uuid-456',
    username: 'other_user',
  };

  const mountPost = (post, user) => {
    cy.mount(
      <BrowserRouter>
        <div className="bg-black min-h-screen p-4">
          <PostCard post={post} currentUser={user} />
        </div>
      </BrowserRouter>
    );
  };

  it('deve renderizar as informações básicas do post corretamente', () => {
    mountPost(mockPost, otherUser);
    cy.get('[data-cy="post-author-name"]').should(
      'contain',
      mockAuthor.display_name
    );
    cy.get('[data-cy="post-content"]').should('contain', mockPost.content);
  });

  it('deve permitir editar o conteúdo do post e salvar', () => {
    const novoTexto = 'Conteúdo editado via Cypress';

    // 1. Interceptamos o PATCH
    cy.intercept('PATCH', '**/posts/post-uuid-999/', {
      statusCode: 200,
      body: { ...mockPost, content: novoTexto, moderation_status: 'APPROVED' }, // Forçamos APPROVED para o teste
    }).as('updatePost');

    // 2. Criamos um wrapper para segurar o estado do post no teste
    const Wrapper = () => {
      const [p, setP] = React.useState(mockPost);
      return (
        <BrowserRouter>
          <div className="bg-black min-h-screen p-4">
            <PostCard
              post={p}
              currentUser={currentUser}
              onPostUpdate={(updated) => setP(updated)} // Aqui a prop atualiza!
            />
          </div>
        </BrowserRouter>
      );
    };

    cy.mount(<Wrapper />);

    // 3. Fluxo de edição
    cy.get('[data-cy="user-action-menu-trigger"]').click();
    cy.get('[data-cy="user-action-edit"]').click();
    cy.get('[data-cy="post-edit-input"]').clear().type(novoTexto);
    cy.get('[data-cy="post-edit-save"]').click();

    cy.wait('@updatePost');

    // 4. Agora o texto TEM que estar lá porque o Wrapper atualizou a prop 'post'
    cy.get('[data-cy="post-edit-input"]').should('not.exist');
    cy.get('[data-cy="post-content"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain', novoTexto);
  });
  it('deve abrir o modal de denúncia e enviar quando for outro usuário', () => {
    // 🚀 O QUE FALTOU: Interceptar a chamada para o mock responder 201
    cy.intercept('POST', '**/api/reports/', {
      statusCode: 201,
      body: { message: 'Created' },
    }).as('postReport');

    mountPost(mockPost, otherUser);

    // Abre o modal
    cy.get('[data-cy="open-report-modal"]').should('be.visible').click();
    cy.contains('h3', 'Denunciar Post').should('be.visible');

    // Clica no botão de confirmar
    cy.get('[data-cy="confirm-report-button"]').click();

    // Aguarda o mock responder
    cy.wait('@postReport');

    // Agora o modal vai fechar porque recebeu sucesso!
    cy.contains('h3', 'Denunciar Post').should('not.exist');
  });

  it('deve exibir o badge de revisão quando o post está PENDING', () => {
    const pendingPost = { ...mockPost, moderation_status: 'PENDING' };
    mountPost(pendingPost, otherUser);
    cy.get('[data-cy="post-moderation-badge"]').should('be.visible');
    cy.get('[data-cy="post-image"]').should('have.class', 'blur-2xl');
  });

  it('deve esconder as ações de denúncia no próprio post', () => {
    mountPost(mockPost, currentUser);
    // ✅ No seu PostCard, o ReportButton (que tem o data-cy) só renderiza se !isOwnPost
    cy.get('[data-cy="open-report-modal"]').should('not.exist');
  });
});
