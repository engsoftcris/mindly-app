// cypress/e2e/auth/follow_flow.cy.js

// ⚠️ Use isso só se você tiver erros de React fora do controle do teste.
// Se não precisar, pode remover.
Cypress.on('uncaught:exception', () => false);

describe('Fluxo de Follow/Unfollow entre Usuários', () => {
  const userA = {
    id: 'user-a-id',
    username: 'user_test_a',
    display_name: 'User A',
  };

  const userB = {
    id: 'uuid-user-b',
    username: 'perfil_destino',
    display_name: 'Perfil Destino',
  };

  const mockMyProfile = {
    ...userA,
    profile_picture: null,
  };

  const mockPublicProfile = {
    id: userB.id,
    username: userB.username,
    display_name: userB.display_name,
    profile_picture: null,
    is_following: false,
  };

  const visitAuthed = (path = '/') => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token-123');
      },
    });
  };

  beforeEach(() => {
    cy.clearLocalStorage();

    // ✅ 1) "Eu logado" — AuthContext chama GET /accounts/profile/
    cy.intercept('GET', '**/accounts/profile/**', {
      statusCode: 200,
      body: mockMyProfile,
    }).as('getMyProfile');

    // ✅ 2) Perfil público do userB
    // Seu log mostrou que a request real é:
    // GET http://localhost:8000/api/accounts/profiles/perfil_destino/
    cy.intercept('GET', `**/accounts/profiles/${userB.username}/**`, {
      statusCode: 200,
      body: mockPublicProfile,
    }).as('getPublicProfile');

    // ✅ 3) Follow/Unfollow com estado (alternando 201 ↔ 200)
    // Seu FollowButton usa: POST /accounts/profiles/:id/follow/
    let isFollowing = false;

    cy.intercept('POST', `**/accounts/profiles/${userB.id}/follow/**`, (req) => {
      isFollowing = !isFollowing;

      req.reply({
        statusCode: isFollowing ? 201 : 200,
        body: { message: isFollowing ? 'Agora estás a seguir.' : 'Deixaste de seguir.' },
      });
    }).as('toggleFollow');
  });

  it('Deve seguir e deixar de seguir um usuário através do perfil público', () => {
    visitAuthed(`/profile/${userB.username}`);

    // Auth + perfil público carregaram
    cy.wait('@getMyProfile');
    cy.wait('@getPublicProfile');

    // Estado inicial: Seguir
    cy.contains('button', /^Seguir$/)
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });

    // Follow: 201 + toast + botão muda
    cy.wait('@toggleFollow');
    cy.contains('button', /^Seguindo$/).should('be.visible');
    cy.contains('Agora estás a seguir.').should('be.visible');

    // Unfollow: 200 + toast + botão volta
    cy.contains('button', /^Seguindo$/)
      .scrollIntoView()
      .should('be.visible')
      .click({ force: true });

    cy.wait('@toggleFollow');
    cy.contains('button', /^Seguir$/).should('be.visible');
    cy.contains('Deixaste de seguir.').should('be.visible');
  });

  it('Não deve mostrar o botão de follow no meu próprio perfil', () => {
    // Se você abre seu próprio perfil público, o app deve ocultar o FollowButton
    visitAuthed(`/profile/${userA.username}`);
    cy.wait('@getMyProfile');

    cy.contains('button', /^Seguir$/).should('not.exist');
    cy.contains('button', /^Seguindo$/).should('not.exist');
  });
});
