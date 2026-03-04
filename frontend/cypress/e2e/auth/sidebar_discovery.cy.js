describe('Mindly - Jornada Completa do Utilizador', () => {

  const mockProfile = {
    id: '123',
    username: 'testuser',
    display_name: 'Teste Cypress',
    profile_picture: null,
  };

  const mockPostsEmpty = { count: 0, next: null, results: [] };

  const mockSuggestions = [
    {
      id: '456',
      username: 'juliet.bennett',
      display_name: 'Juliet Bennett',
      profile_picture: null,
      is_following: false
    },
    {
      id: '789',
      username: 'cris.tobias',
      display_name: 'Cristiano Tobias',
      profile_picture: null,
      is_following: false
    }
  ];

  const mockSearchResults = {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: '789',
        username: 'cris.tobias',
        full_name: 'Cristiano Tobias',
        profile_picture: null,
        avatar: null
      }
    ]
  };

  const visitAuthed = (path = '/', options = {}) => {
    cy.visit(path, {
      ...options,
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token-123');
        if (typeof options.onBeforeLoad === 'function') {
          options.onBeforeLoad(win);
        }
      },
    });
  };

  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearLocalStorage();

    cy.intercept('GET', '**/api/accounts/profile/**', {
      statusCode: 200,
      body: mockProfile,
    }).as('getProfile');

    cy.intercept('GET', '**/api/accounts/feed/**', {
      statusCode: 200,
      body: mockPostsEmpty,
    }).as('getPostsInitial');

    cy.intercept('GET', '**/api/accounts/suggested-follows/**', { 
      statusCode: 200, 
      body: mockSuggestions 
    }).as('getSuggestions');

    // CORREÇÃO: Rota de busca exata como no SearchBar
   cy.intercept('GET', '**/api/accounts/search/**', (req) => {
  if (req.url.includes('q=cris')) {
    req.reply({
      statusCode: 200,
      body: {
        count: 1,
        results: [
          {
            id: '789',
            user: {
              username: 'cris.tobias',
              full_name: 'Cristiano Tobias',
              profile_picture: null
            },
            // fallbacks na raiz também
            username: 'cris.tobias',
            full_name: 'Cristiano Tobias',
            profile_picture: null
          }
        ]
      }
    });
  } else {
    req.reply({ statusCode: 200, body: { count: 0, results: [] } });
  }
}).as('getSearch');

    cy.intercept('GET', '**/api/notifications/**', { 
      statusCode: 200, 
      body: [] 
    }).as('getNotificationsEmpty');
  });

 describe('Sidebar e Descoberta (Busca + Sugestões)', () => {
  it('1. Deve interagir com sugestões e realizar busca usando data-cy', () => {
    visitAuthed('/');
    cy.wait(['@getProfile', '@getSuggestions'], { timeout: 10000 });

    cy.get('[data-cy="suggested-item"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain', 'Juliet Bennett');

    cy.get('[data-cy="search-input"]').type('cris');
    
    // CORREÇÃO: Espera o debounce de 300ms + um extra
    cy.wait(500);
    
    // Agora a requisição deve ter sido feita
    cy.wait('@getSearch', { timeout: 10000 });

    cy.get('[data-cy="search-result-item"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain', 'Cristiano Tobias')
      .click();

    cy.url().should('contain', '/profile/');
  });
});

  describe('Responsividade Mobile', () => {
    it('2. Deve ajustar layout para iPhone e esconder Sidebar', () => {
      cy.viewport('iphone-xr');
      visitAuthed('/');
      
      cy.wait('@getSuggestions', { timeout: 10000 });
      
      cy.get('[data-cy="suggested-item"]').should('not.be.visible');
    });
  });
});