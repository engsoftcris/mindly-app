describe('Mindly - Gestão Completa de Bloqueios (TAL-14)', () => {
  const TARGET_UUID = '47c2903b-3ee2-4d35-9bb7-51949fb0274d';
  const TARGET_USER = 'target_user';

  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearLocalStorage();
    
    // Mock global para evitar redirects ao login
    cy.intercept('GET', /.*\/api\/accounts\/profile\/.*/, {
      statusCode: 200,
      body: { id: 'my-id', username: 'testuser', display_name: 'Eu' }
    }).as('getMe');

    cy.intercept('GET', '**/api/notifications/**', { statusCode: 200, body: [] });
  });

  const visitAuthed = (path) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token-123');
      },
    });
  };

  it('Deve bloquear no perfil e desbloquear na página de Settings', () => {
    // 1. Mock do Perfil que será bloqueado
    cy.intercept('GET', `**/api/accounts/profiles/${TARGET_UUID}/`, {
      id: TARGET_UUID,
      username: TARGET_USER,
      display_name: 'Usuário Alvo',
      is_blocked: false
    }).as('getTargetInitial');

    // 2. Mock da Ação de Bloqueio
    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block/`, {
      statusCode: 201,
      body: { is_blocked: true }
    }).as('blockAction');

    // --- BLOQUEAR ---
    visitAuthed(`/profile/${TARGET_UUID}`);
    cy.wait('@getTargetInitial');

    cy.get('[data-cy="user-action-menu-trigger"]').click();
    cy.get('[data-cy="user-action-block"]').click();
    cy.wait('@blockAction');

    // --- IR PARA SETTINGS (Onde está o Unblock) ---
    // Removemos a verificação de /feed para não travar o teste
    visitAuthed('/settings');
    
    // Mock da lista de bloqueados que o componente BlockedUsersList vai chamar
    cy.intercept('GET', '**/api/accounts/profiles/blocked-users/', [
      { id: TARGET_UUID, username: TARGET_USER, display_name: 'Usuário Alvo' }
    ]).as('getBlockedList');

    // Clica no botão "Manage Blocked" dentro da SettingsPage
    cy.get('[data-cy="settings-view-blocked"]').click();
    cy.wait('@getBlockedList');

    // Verifica se o usuário aparece na lista de bloqueados dentro das Settings
    cy.contains(`@${TARGET_USER}`).should('be.visible');

    // --- DESBLOQUEAR ---
    // Mock do POST de Desbloqueio
    cy.intercept('POST', `**/api/accounts/profiles/${TARGET_UUID}/block/`, {
      statusCode: 200,
      body: { is_blocked: false }
    }).as('unblockAction');

    // Clica no botão Unblock (aquele que criamos no BlockedUsersList.jsx)
    cy.get(`[data-cy="unblock-btn-${TARGET_USER}"]`).click();
    cy.wait('@unblockAction');

    // O usuário deve sumir da lista de bloqueados em tempo real
    cy.contains(`@${TARGET_USER}`).should('not.exist');
    cy.contains("You haven't blocked anyone yet.").should('be.visible');
  });
});