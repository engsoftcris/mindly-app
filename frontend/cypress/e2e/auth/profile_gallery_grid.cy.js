Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

describe('TAL-20: Galeria de Perfil - Grid e Filtros de Mídia', () => {
  const profileId = '123';

  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearLocalStorage();

    cy.intercept('GET', '**/api/accounts/profile**', {
      statusCode: 200,
      body: { id: '999', username: 'cristiano', display_name: 'Cristiano' }
    }).as('getAuth');

    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });

    cy.intercept('GET', `**/api/accounts/profiles/${profileId}/`, {
      statusCode: 200,
      body: {
        username: 'galeria_user',
        display_name: 'Galeria User',
        is_restricted: false,
        posts: [
          { id: 1, content: 'Foto 1', media_url: 'https://via.placeholder.com/300.jpg', moderation_status: 'APPROVED', created_at: new Date().toISOString() },
          { id: 2, content: 'Video 1', media_url: 'https://www.w3schools.com/html/mov_bbb.mp4', moderation_status: 'APPROVED', created_at: new Date().toISOString() },
          { id: 3, content: 'Foto 2', media_url: 'https://via.placeholder.com/301.jpg', moderation_status: 'APPROVED', created_at: new Date().toISOString() },
          { id: 4, content: 'Apenas Texto', media_url: null, moderation_status: 'APPROVED', created_at: new Date().toISOString() }
        ]
      }
    }).as('fetchProfile');
  });

  it('Deve renderizar o layout de Grid (3 colunas) e validar DoD da TAL-20', () => {
    cy.visit(`/profile/${profileId}`);
    cy.wait(['@getAuth', '@fetchProfile']);

    // 1. Verifica se o texto puro aparece na aba 'Posts'
    cy.contains('Apenas Texto').should('be.visible');

    // 2. Troca para a aba de Fotos usando Regex Case-Insensitive
    // Isso ignora se está "Photos", "photos" ou "PHOTOS"
    cy.get('button').contains(/photos/i).click();

    // 3. Valida o Grid de 3 colunas (DoD: Frontend)
    cy.get('.grid').should('have.class', 'grid-cols-3');

    // 4. Valida se o post de "Apenas Texto" sumiu (DoD: Filtragem)
    cy.contains('Apenas Texto').should('not.exist');

    // 5. Valida Aspect-Ratio (DoD: Qualidade Visual)
    // Verifica se a div do post no grid é quadrada
    cy.get('.aspect-square').first().should('be.visible').then(($el) => {
      const width = $el[0].getBoundingClientRect().width;
      const height = $el[0].getBoundingClientRect().height;
      expect(width).to.be.closeTo(height, 1); // Aceita diferença de 1px de arredondamento
    });
  });

  it('Deve exibir indicador de vídeo na aba de Vídeos', () => {
    cy.visit(`/profile/${profileId}`);
    cy.wait(['@getAuth', '@fetchProfile']);

    // Clica na aba de Vídeos (Case Insensitive)
    cy.get('button').contains(/videos/i).click();

    // Verifica o vídeo
    cy.get('video').should('exist');
    
    // Verifica o indicador visual de vídeo (o SVG que você colocou no JSX)
    // Como está dentro de uma div com absolute top-2 right-2
    cy.get('svg').should('be.visible'); 
  });
});