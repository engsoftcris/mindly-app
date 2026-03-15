describe('Mindly - Profile Connections & Modal UX', () => {
  const targetId = '11111111-1111-1111-1111-111111111111';
  const otherUserId = 'user-999';

  beforeEach(() => {
    cy.login();

    // Mock do Perfil que estamos visitando
    cy.intercept('GET', `**/api/accounts/profiles/${targetId}/`, {
      statusCode: 200,
      body: {
        id: targetId,
        username: 'target_user',
        display_name: 'Target User',
        followers_count: 10,
        following_count: 5,
        is_following: false,
        posts: []
      }
    }).as('getTargetProfile');

    // Mock inicial de Followers
    cy.intercept('GET', `**/api/accounts/profiles/${targetId}/connections/?type=followers`, {
      statusCode: 200,
      body: [{
        profile_id: otherUserId,
        username: 'follower_bot',
        display_name: 'Follower Bot',
        is_following: false
      }]
    }).as('getFollowers');

    // Mock de Following (para o teste de Tabs)
    cy.intercept('GET', `**/api/accounts/profiles/${targetId}/connections/?type=following`, {
      statusCode: 200,
      body: [{
        profile_id: 'following-1',
        username: 'idol_user',
        display_name: 'My Idol',
        is_following: true
      }]
    }).as('getFollowing');

    cy.intercept('POST', '**/api/accounts/profiles/*/follow/', {
      statusCode: 200,
      body: { is_following: true }
    }).as('followAction');
  });

  // TESTE 1: O que já fizemos (Follow e Fechar)
  it('Deve seguir um usuário e fechar o modal corretamente', () => {
    cy.visit(`/profile/${targetId}`);
    cy.wait('@getTargetProfile');

    cy.contains('Followers').click({ force: true });
    cy.wait('@getFollowers');

    cy.get('div.overflow-y-auto').find('button').contains(/^Follow$/).first().click({ force: true });
    cy.wait('@followAction');
    cy.contains('button', 'Following').should('be.visible');

    // Fechar
    cy.get('h3').contains('Connections').parent().find('button').click();
    cy.contains('h3', 'Connections').should('not.exist');
  });

  // TESTE 2: Navegação ao clicar no usuário
  it('Deve navegar para o perfil do usuário ao clicar no card da lista', () => {
    cy.visit(`/profile/${targetId}`);
    cy.contains('Followers').click({ force: true });
    cy.wait('@getFollowers');

    // Clica no nome do usuário (deve disparar o navigate do div pai)
    cy.contains('Follower Bot').click({ force: true });

    // Verifica se a URL mudou para o perfil do usuário clicado
    cy.url().should('include', `/profile/${otherUserId}`);
    // O modal deve fechar automaticamente no navigate (conforme o teu código onClose())
    cy.contains('h3', 'Connections').should('not.exist');
  });

  // TESTE 3: Alternância entre Abas (Tabs)
  it('Deve alternar entre as listas de Followers e Following', () => {
    cy.visit(`/profile/${targetId}`);
    cy.contains('Followers').click({ force: true });
    cy.wait('@getFollowers');
    cy.contains('Follower Bot').should('be.visible');

    // Clica na aba Following
    cy.get('button').contains('Following').click();
    cy.wait('@getFollowing');

    // Verifica se a lista atualizou com o novo usuário do mock de following
    cy.contains('My Idol').should('be.visible');
    cy.contains('Follower Bot').should('not.exist');
  });
});