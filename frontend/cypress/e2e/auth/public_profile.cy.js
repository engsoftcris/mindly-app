// cypress/e2e/public_profile_privacy.cy.js

Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

describe('Fluxo de Perfil Público e Privacidade (TAL-30)', () => {
  const publicProfileId = 'uuid-publico-123';
  const privateProfileId = 'uuid-privado-456';

  beforeEach(() => {
    // Limpa para garantir estado limpo
    cy.clearLocalStorage();

    // 1. SIMULA O LOGIN (Baseado no seu arquivo de referência)
    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });

    // Mock do Perfil Logado (necessário se o seu Header/Sidebar carregar o "eu")
    cy.intercept('GET', '**/accounts/profile*', {
      statusCode: 200,
      body: {
        username: 'cristiano',
        full_name: 'Cristiano',
        profile_picture: 'https://via.placeholder.com/150'
      }
    }).as('getMyProfile');
  });

  it('Cenário 1: Deve exibir posts normalmente quando o perfil é PÚBLICO', () => {
    // Mock do Perfil sendo visitado
    cy.intercept('GET', `**/accounts/profiles/${publicProfileId}/`, {
      statusCode: 200,
      body: {
        username: 'johndoe',
        display_name: 'John Doe',
        profile_picture: 'https://via.placeholder.com/150',
        bio: 'Software Engineer',
        is_restricted: false, // Perfil aberto
        posts: [
          {
            id: 1,
            content: 'Post público de teste',
            media_url: 'https://via.placeholder.com/300',
            moderation_status: 'APPROVED',
            created_at: '2024-01-01T12:00:00Z'
          }
        ]
      }
    }).as('fetchPublic');

    cy.visit(`/profile/${publicProfileId}`);
    cy.wait(['@getMyProfile', '@fetchPublic'], { timeout: 15000 });

    // Validações de UI
    cy.get('h1').should('contain', 'John Doe');
    cy.contains('Post público de teste').should('be.visible');
    cy.contains('These posts are protected').should('not.exist');
  });

  it('Cenário 2: Deve exibir o CADEADO quando o perfil é RESTRITO (Privado)', () => {
    cy.intercept('GET', `**/accounts/profiles/${privateProfileId}/`, {
      statusCode: 200,
      body: {
        username: 'secret_user',
        display_name: 'Top Secret',
        is_restricted: true, 
        posts: []
      }
    }).as('fetchPrivate');

    cy.visit(`/profile/${privateProfileId}`);
    cy.wait(['@getMyProfile', '@fetchPrivate'], { timeout: 15000 });

    // 1. Valida a mensagem de privacidade (Cadeado)
    cy.contains('These posts are protected').should('be.visible');
    
    // 2. O botão de Follow deve estar visível
    cy.get('button').contains(/Follow/i).should('be.visible');

    // 3. CORREÇÃO AQUI: Garante que a lista de posts NÃO existe no DOM
    cy.get('.divide-y').should('not.exist');
    
    // 4. Garante que nenhum conteúdo de post vazou
    cy.contains('Post público de teste').should('not.exist');
  });

  it('Cenário 3: Deve mostrar a badge de "Under Review" em posts PENDENTES', () => {
    cy.intercept('GET', `**/accounts/profiles/${publicProfileId}/`, {
      statusCode: 200,
      body: {
        username: 'johndoe',
        is_restricted: false,
        posts: [
          {
            id: 2,
            content: 'Em análise',
            media_url: 'https://via.placeholder.com/300',
            moderation_status: 'PENDING',
            created_at: '2024-01-01T12:00:00Z'
          }
        ]
      }
    }).as('fetchPending');

    cy.visit(`/profile/${publicProfileId}`);
    cy.wait('@fetchPending');

    // Valida o blur e o texto de análise
    cy.contains(/Under Review/i).should('be.visible');
    cy.get('img, video').should('have.class', 'blur-2xl');
  });

  it('Cenário 4: Deve exibir erro quando o perfil não existe (404)', () => {
    cy.intercept('GET', '**/accounts/profiles/invalid-id/', {
      statusCode: 404
    }).as('fetch404');

    cy.visit('/profile/invalid-id');
    cy.wait('@fetch404');

    cy.contains(/User not found/i).should('be.visible');
  });
});