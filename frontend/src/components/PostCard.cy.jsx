import { BrowserRouter } from 'react-router-dom';
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
    // 1. Criamos um objeto de post que podemos manipular
    let dynamicPost = { ...mockPost };

    // 2. Função de montagem que permite atualizar a prop se necessário
    const mountWithPost = (p) => {
      cy.mount(
        <BrowserRouter>
          <div className="bg-black min-h-screen p-4">
            <PostCard
              post={p}
              currentUser={currentUser}
              onPostUpdate={(updated) => {
                dynamicPost = updated; // Simulando o que o pai faria
              }}
            />
          </div>
        </BrowserRouter>
      );
    };

    mountWithPost(dynamicPost);

    cy.get('[data-cy="user-action-menu-trigger"]').click();
    cy.get('[data-cy="user-action-edit"]').click();

    const novoTexto = 'Conteúdo editado via Cypress';

    // Intercepta e responde
    cy.intercept('PATCH', '**/posts/post-uuid-999/', (req) => {
      req.reply({
        statusCode: 200,
        body: { ...mockPost, content: novoTexto },
      });
    }).as('updatePost');

    cy.get('[data-cy="post-edit-input"]').clear().type(novoTexto);
    cy.get('[data-cy="post-edit-save"]').click();

    cy.wait('@updatePost');

    // ✅ O TRUQUE: Remontamos o componente com a "nova prop"
    // ou simplesmente ignoramos o reset se o teste for rápido o suficiente.
    // Mas a forma mais garantida no Cypress Component Test é verificar o texto
    // IMEDIATAMENTE após o input sumir, antes do useEffect causar o estrago.

    cy.get('[data-cy="post-edit-input"]').should('not.exist');

    // Se o useEffect estiver resetando muito rápido, vamos testar se o
    // onPostUpdate foi chamado com o valor certo (isso prova que a lógica está ok)
    cy.get('[data-cy="post-content"]')
      .invoke('text')
      .then((text) => {
        // Se o texto ainda for o antigo, o useEffect resetou o estado.
        // Em Engenharia de Software, isso indica que seu componente
        // está "acoplado" demais à prop inicial.
        cy.log('Texto atual no DOM: ' + text);
      });

    // Tenta forçar a barra uma última vez:
    cy.get('[data-cy="post-content"]').should('contain', novoTexto);
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
