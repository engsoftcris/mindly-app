Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

describe('Fluxo de Perfil Público e Privacidade (TAL-30)', () => {
  const publicId = '123';
  const privateId = '456';

  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearLocalStorage();

    // 1. MOCK DE SEGURANÇA (Auth): O seu app espera este endpoint para validar o login
    // Usamos o padrão que funcionou no seu modelo (sem o /me)
    cy.intercept('GET', '**/api/accounts/profile**', {
      statusCode: 200,
      body: { id: '999', username: 'cristiano', display_name: 'Cristiano' }
    }).as('getProfileAuth');

    // 2. TOKEN FAKE
    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });
  });

  it('Cenário 1: Deve exibir posts e abas quando o perfil é PÚBLICO', () => {
    // Intercepta a chamada do componente PublicProfile
    cy.intercept('GET', `**/api/accounts/profiles/${publicId}/`, {
      statusCode: 200,
      body: {
        username: 'johndoe',
        display_name: 'John Doe',
        is_restricted: false,
        posts: [{ id: 1, content: 'Post público', moderation_status: 'APPROVED', created_at: new Date().toISOString() }]
      }
    }).as('fetchPublic');

    cy.visit(`/profile/${publicId}`);
    
    // Esperamos o Auth carregar E o Perfil Público carregar
    cy.wait(['@getProfileAuth', '@fetchPublic'], { timeout: 15000 });

    cy.contains('h1', 'John Doe').should('be.visible');
    cy.contains('Post público').should('be.visible');
  });

  it('Cenário 2: Deve exibir a proteção quando o perfil é RESTRITO', () => {
    cy.intercept('GET', `**/api/accounts/profiles/${privateId}/`, {
      statusCode: 200,
      body: {
        username: 'secret_user',
        is_restricted: true,
        posts: []
      }
    }).as('fetchPrivate');

    cy.visit(`/profile/${privateId}`);
    cy.wait(['@getProfileAuth', '@fetchPrivate'], { timeout: 15000 });

    cy.contains('These posts are protected').should('be.visible');
  });

  it('Cenário 3: Deve mostrar a badge de "Under Review" em posts PENDENTES', () => {
    cy.intercept('GET', `**/api/accounts/profiles/${publicId}/`, {
      statusCode: 200,
      body: {
        username: 'johndoe',
        is_restricted: false,
        posts: [{ 
            id: 2, 
            content: 'Em análise', 
            media_url: 'test.jpg', 
            moderation_status: 'PENDING', 
            created_at: new Date().toISOString() 
        }]
      }
    }).as('fetchPending');

    cy.visit(`/profile/${publicId}`);
    cy.wait(['@getProfileAuth', '@fetchPending']);

    cy.contains('Under Review').should('be.visible');
  });

  it('Cenário 4: Deve exibir erro quando o perfil não existe (404)', () => {
    cy.intercept('GET', `**/api/accounts/profiles/invalid-id/`, {
      statusCode: 404,
      body: { error: 'Not Found' }
    }).as('fetch404');

    cy.visit('/profile/invalid-id');
    cy.wait(['@getProfileAuth', '@fetch404']);

    cy.contains('User not found').should('be.visible');
  });
});