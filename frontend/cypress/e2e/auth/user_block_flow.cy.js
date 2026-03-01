describe('Fluxo de Bloqueio de Utilizador no Dashboard', () => {
  const MY_UUID = '00000000-0000-0000-0000-000000000001';
  const TARGET_UUID = '99999999-9999-9999-9999-999999999999';

  beforeEach(() => {
    Cypress.on('uncaught:exception', () => false);
    cy.viewport(1280, 800);

    // Mock do Perfil do Usuário Logado (Navbar/AuthContext)
    cy.intercept('GET', '**/api/accounts/profile/', {
      statusCode: 200,
      body: { 
        id: MY_UUID, 
        username: 'cristiano.tobias',
        display_name: 'Cristiano'
      }
    }).as('getProfile');

    // Login via custom command (certifique-se que ele seta o localStorage)
    cy.login({ path: '/' });
  });

  it('1. Deve realizar o bloqueio no feed', () => {
    cy.intercept('GET', '**/api/posts/**', {
      statusCode: 200,
      body: { 
        results: [{ 
          id: 101, 
          content: 'Post de teste', 
          author: { id: TARGET_UUID, username: 'outro_usuario' }
        }] 
      }
    }).as('getFeed');

    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block/`, {
      statusCode: 200,
      body: { success: true, is_blocked: true }
    }).as('postBlock');

    cy.visit('/');
    cy.wait(['@getProfile', '@getFeed']);

    cy.get('[data-cy="user-action-menu-trigger"]').first().click({ force: true });
    cy.get('[data-cy="user-action-block"]').click({ force: true });

    cy.wait('@postBlock');
    cy.contains('Post de teste').should('not.exist');
  });

  it('2. Deve redirecionar ao bloquear na página de perfil', () => {
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/`, { 
      statusCode: 200, 
      body: { id: TARGET_UUID, username: 'outro_usuario', is_blocked: false } 
    }).as('getPublicProfile');

    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block/`, {
      statusCode: 200,
      body: { success: true, is_blocked: true }
    }).as('postBlockProfile');

    cy.visit(`/profile/${TARGET_UUID}`);
    cy.wait(['@getProfile', '@getPublicProfile']);

    cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true });
    cy.get('[data-cy="user-action-block"]').click({ force: true });

    cy.wait('@postBlockProfile');
    cy.url().should('include', '/feed'); // Verifica se redirecionou após bloquear
  });

  it('3. Deve realizar o desbloqueio na página de perfil', () => {
    // 1. ESTADO INICIAL: Usuário Bloqueado
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/`, { 
      statusCode: 200, 
      body: { 
        id: TARGET_UUID, 
        username: 'usuario_bloqueado', 
        is_blocked: true, // Faz o seu JSX renderizar data-cy="user-action-unblock"
        posts: [] 
      } 
    }).as('getBlockedProfile');

    // 2. MOCK DO POST (Toggle)
    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block/`, {
      statusCode: 200,
      body: { success: true, is_blocked: false } 
    }).as('postToggleBlock');

    cy.visit(`/profile/${TARGET_UUID}`);
    cy.wait(['@getProfile', '@getBlockedProfile']);

    // Abre menu e clica no Unblock
    cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true });
    
    // O ID aqui é "unblock" porque is_blocked era true no primeiro GET
    cy.get('[data-cy="user-action-unblock"]')
      .should('contain', 'Unblock')
      .click({ force: true });

    cy.wait('@postToggleBlock');

    // --- O PULO DO GATO ---
    // 3. Atualizamos o intercept do GET para retornar is_blocked: false
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/`, { 
      statusCode: 200, 
      body: { 
        id: TARGET_UUID, 
        username: 'usuario_bloqueado', 
        is_blocked: false, // Agora desbloqueado
        posts: [] 
      } 
    }).as('getUnblockedProfile');

    // 4. Recarregamos a página para o React ler o novo estado do perfil
    cy.reload();
    cy.wait(['@getProfile', '@getUnblockedProfile']);

    // 5. VALIDAÇÃO: Abre o menu e verifica se o botão virou "Block"
    cy.get('[data-cy="user-action-menu-trigger"]').click({ force: true });

    // Como is_blocked agora é false, o data-cy mudou no seu JSX para "user-action-block"
    cy.get('[data-cy="user-action-block"]', { timeout: 10000 })
      .should('exist')
      .and('contain', 'Block')
      .and('not.contain', 'Unblock');
    
    cy.log('Sucesso: Fluxo de desbloqueio completo!');
  });
});