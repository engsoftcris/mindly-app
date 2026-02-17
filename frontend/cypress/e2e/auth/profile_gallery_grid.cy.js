// cypress/e2e/auth/profile_gallery_grid.cy.js

// Use só se necessário; ideal é remover depois que estabilizar.
// Cypress.on('uncaught:exception', () => false);

describe('TAL-20: Galeria de Perfil - Grid e Filtros de Mídia', () => {
  const profileId = '123';

  const visitAuthed = (path) => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token-123');
        win.localStorage.setItem('refresh', 'fake-refresh-123');
      },
    });
  };

  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearLocalStorage();
    cy.clearCookies();

    // ✅ AuthContext (GET /accounts/profile/)
    cy.intercept('GET', '**/accounts/profile/**', {
      statusCode: 200,
      body: { id: '999', username: 'cristiano', display_name: 'Cristiano', profile_picture: null },
    }).as('getAuth');

    // ✅ Perfil público
    // Obs: no seu app real, já apareceu /api/accounts/profiles/perfil_destino/
    // Então aqui interceptamos de forma tolerante:
    // - por id (se for /profiles/123/)
    // - ou por username (se você mudar no futuro)
    cy.intercept('GET', /\/(api\/)?accounts\/profiles\/[^/]+\/?$/, {
      statusCode: 200,
      body: {
        username: 'galeria_user',
        display_name: 'Galeria User',
        is_restricted: false,
        posts: [
          {
            id: 1,
            content: 'Foto 1',
            media_url: 'https://via.placeholder.com/300.jpg',
            moderation_status: 'APPROVED',
            created_at: new Date().toISOString(),
          },
          {
            id: 2,
            content: 'Video 1',
            media_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
            moderation_status: 'APPROVED',
            created_at: new Date().toISOString(),
          },
          {
            id: 3,
            content: 'Foto 2',
            media_url: 'https://via.placeholder.com/301.jpg',
            moderation_status: 'APPROVED',
            created_at: new Date().toISOString(),
          },
          {
            id: 4,
            content: 'Apenas Texto',
            media_url: null,
            moderation_status: 'APPROVED',
            created_at: new Date().toISOString(),
          },
        ],
      },
    }).as('fetchProfile');
  });

  it('Deve renderizar o layout de Grid (3 colunas) e validar DoD da TAL-20', () => {
    visitAuthed(`/profile/${profileId}`);
    cy.wait(['@getAuth', '@fetchProfile']);

    // 1) Texto puro aparece na aba Posts
    cy.contains('Apenas Texto').should('be.visible');

    // 2) Troca para Fotos (case-insensitive)
    cy.contains('button', /photos/i).should('be.visible').click({ force: true });

    // 3) Grid 3 colunas (melhor: mirar o grid de mídia, não qualquer .grid)
    // Se você tiver mais de um grid na página, essa linha pode ficar frágil.
    // Ideal é adicionar data-cy no grid.
    cy.get('.grid.grid-cols-3').should('exist');

    // 4) Texto deve sumir na aba Fotos
    cy.contains('Apenas Texto').should('not.exist');

    // 5) Aspect-square: checa se é quadrado
    cy.get('.aspect-square')
      .first()
      .should('be.visible')
      .then(($el) => {
        const { width, height } = $el[0].getBoundingClientRect();
        expect(width).to.be.closeTo(height, 1);
      });
  });

  it('Deve exibir indicador de vídeo na aba de Vídeos', () => {
    visitAuthed(`/profile/${profileId}`);
    cy.wait(['@getAuth', '@fetchProfile']);

    cy.contains('button', /videos/i).should('be.visible').click({ force: true });

    // Verifica que existe algum elemento de vídeo
    cy.get('video').should('exist');

    // Indicador: seu teste atual usa "cy.get('svg')" que pode pegar qualquer svg da página.
    // Melhor: procurar o svg dentro de um card do grid, ou dentro do container do vídeo.
    // Sem data-cy, vamos pelo mínimo: svg visível em conjunto com video.
    cy.get('video').first().parents().find('svg').should('exist');
  });
});
