// cypress/e2e/auth/public_profile.cy.js

// Se não precisar, remova para não mascarar erro real.
// Cypress.on('uncaught:exception', () => false);

describe('Fluxo de Perfil Público e Privacidade (TAL-30)', () => {
  const publicId = '123';
  const privateId = '456';

  const visitAuthed = (path) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token-123');
        win.localStorage.setItem('refresh', 'fake-refresh-123');
      },
    });
  };

  const profileRootUrl = /\/(api\/)?accounts\/profile\/?$/;

  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearLocalStorage();
    cy.clearCookies();

    const authBody = { id: '999', username: 'cristiano', display_name: 'Cristiano' };

    // ✅ Seu app chama ESTE endpoint (log comprovou)
    cy.intercept('GET', profileRootUrl, { statusCode: 200, body: authBody }).as('getProfileAuthRoot');
  });

  it('Cenário 1: Deve exibir posts e abas quando o perfil é PÚBLICO', () => {
    cy.intercept('GET', `**/accounts/profiles/${publicId}/**`, {
      statusCode: 200,
      body: {
        username: 'johndoe',
        display_name: 'John Doe',
        is_restricted: false,
        posts: [
          {
            id: 1,
            content: 'Post público',
            moderation_status: 'APPROVED',
            created_at: new Date().toISOString(),
          },
        ],
      },
    }).as('fetchPublic');

    visitAuthed(`/profile/${publicId}`);

    cy.wait('@getProfileAuthRoot', { timeout: 15000 });
    cy.wait('@fetchPublic', { timeout: 15000 });

    cy.contains('h1', 'John Doe').should('be.visible');
    cy.contains('Post público').should('be.visible');
  });

  it('Cenário 2: Deve exibir a proteção quando o perfil é RESTRITO', () => {
    cy.intercept('GET', `**/accounts/profiles/${privateId}/**`, {
      statusCode: 200,
      body: {
        username: 'secret_user',
        display_name: 'Secret User',
        is_restricted: true,
        posts: [],
      },
    }).as('fetchPrivate');

    visitAuthed(`/profile/${privateId}`);

    cy.wait('@getProfileAuthRoot', { timeout: 15000 });
    cy.wait('@fetchPrivate', { timeout: 15000 });

    cy.contains(/These posts are protected/i).should('be.visible');
  });

  it('Cenário 3: Deve mostrar a badge de "Under Review" em posts PENDENTES', () => {
    cy.intercept('GET', `**/accounts/profiles/${publicId}/**`, {
      statusCode: 200,
      body: {
        username: 'johndoe',
        display_name: 'John Doe',
        is_restricted: false,
        posts: [
          {
            id: 2,
            content: 'Em análise',
            media_url: 'test.jpg',
            moderation_status: 'PENDING',
            created_at: new Date().toISOString(),
          },
        ],
      },
    }).as('fetchPending');

    visitAuthed(`/profile/${publicId}`);

    cy.wait('@getProfileAuthRoot', { timeout: 15000 });
    cy.wait('@fetchPending', { timeout: 15000 });

    cy.contains(/Under Review/i).should('be.visible');
  });

  it('Cenário 4: Deve exibir erro quando o perfil não existe (404)', () => {
    cy.intercept('GET', `**/accounts/profiles/invalid-id/**`, {
      statusCode: 404,
      body: { error: 'Not Found' },
    }).as('fetch404');

    visitAuthed('/profile/invalid-id');

    cy.wait('@getProfileAuthRoot', { timeout: 15000 });
    cy.wait('@fetch404', { timeout: 15000 });

    cy.contains(/User not found/i).should('be.visible');
  });
});
