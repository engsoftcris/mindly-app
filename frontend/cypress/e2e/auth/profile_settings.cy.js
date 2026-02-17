describe('Profile Settings & Real-time Sync (UUID Era) - Robust Version', () => {
  const MOCK_UUID = 'b369ce73-66ba-4dc9-a736-d79eb3e45e5b';
  const USERNAME = 'cristiano.tobias40';

  const visitAuthed = (path = '/profile') => {
    cy.visit(path, {
      timeout: 15000,
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem('access', 'fake-token-123');
        win.localStorage.setItem('refresh', 'fake-refresh-123');
      },
    });
  };

  // ✅ Endpoints reais (seu log mostrou /profile/ e /profile/me/)
  const profileRootUrl = /\/(api\/)?accounts\/profile\/?$/;
  const profileMeUrl = /\/(api\/)?accounts\/profile\/me\/?$/;

  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.clearCookies();

    // ✅ Mock inicial do Perfil (cobrindo os DOIS endpoints)
    const initialProfile = {
      id: MOCK_UUID,
      username: USERNAME,
      display_name: 'Cristiano Original',
      bio: 'Bio antiga...',
      profile_picture: 'https://ui-avatars.com/api/?name=Cristiano&background=0D8ABC&color=fff',
    };

    cy.intercept('GET', profileRootUrl, { statusCode: 200, body: initialProfile }).as('getProfileRoot');
    cy.intercept('GET', profileMeUrl, { statusCode: 200, body: initialProfile }).as('getProfileMe');

    visitAuthed('/profile');

    // Seu app pode chamar um ou outro; esperamos o primeiro que acontecer
    cy.wait(['@getProfileRoot', '@getProfileMe'], { timeout: 10000 });
  });

  it('1. Deve exibir o nome "Cristiano" na Navbar (extraído do display_name)', () => {
    cy.get('nav p.text-white', { timeout: 12000 })
      .should('be.visible')
      .and('contain', 'Cristiano');

    cy.get('nav p.text-gray-500')
      .should('be.visible')
      .and('contain', USERNAME);

    cy.get('nav p.text-white').should('not.contain', 'Original');
  });

  it('2. Sync Test: Deve atualizar para "Ricardo" e refletir na Navbar instantaneamente', () => {
    const newFullName = 'Ricardo Silva Pro';
    const expectedFirstName = 'Ricardo';

    // ✅ PATCH real: /accounts/profile/me/
    cy.intercept('PATCH', profileMeUrl, {
      statusCode: 200,
      body: {
        id: MOCK_UUID,
        username: USERNAME,
        display_name: newFullName,
        bio: 'Nova bio do Ricardo',
      },
    }).as('updateToRicardo');

    // ✅ Caso o app refaça GET /me/ após salvar
    cy.intercept('GET', profileMeUrl, {
      statusCode: 200,
      body: { id: MOCK_UUID, username: USERNAME, display_name: newFullName, bio: 'Nova bio do Ricardo' },
    }).as('getProfileRicardoMe');

    // (opcional) caso ele use /profile/ em algum lugar
    cy.intercept('GET', profileRootUrl, {
      statusCode: 200,
      body: { id: MOCK_UUID, username: USERNAME, display_name: newFullName, bio: 'Nova bio do Ricardo' },
    }).as('getProfileRicardoRoot');

    cy.get('input:not([disabled])')
      .first()
      .should('be.visible')
      .clear()
      .type(newFullName, { delay: 30 });

    cy.get('button[type="submit"]').should('not.be.disabled').click();

    cy.wait('@updateToRicardo', { timeout: 15000 });

    cy.contains('Profile updated successfully!', { timeout: 10000 }).should('be.visible');

    cy.get('nav', { timeout: 12000 })
      .should('contain', expectedFirstName)
      .and('not.contain', 'Cristiano');
  });

  it('3. Persistência: Deve manter o nome "Ricardo" ao navegar para o Dashboard', () => {
  // 1) Quando navegar, o app pode chamar /profile/ e/ou /profile/me/ de novo.
  // Então ambos devem retornar Ricardo.
  cy.intercept('GET', profileRootUrl, {
    statusCode: 200,
    body: { id: MOCK_UUID, username: USERNAME, display_name: 'Ricardo Silva Pro' },
  }).as('getProfileRootRicardo');

  cy.intercept('GET', profileMeUrl, {
    statusCode: 200,
    body: { id: MOCK_UUID, username: USERNAME, display_name: 'Ricardo Silva Pro' },
  }).as('getProfileMeRicardo');

  // 2) Dashboard sempre busca posts -> precisamos mockar para não bater no backend (401)
  cy.intercept('GET', '**/posts/**', {
    statusCode: 200,
    body: { count: 0, next: null, results: [] },
  }).as('getPosts');

  // 3) Navega pro Dashboard
  cy.get('nav a').first().click({ force: true });

  cy.url({ timeout: 10000 }).should('eq', `${Cypress.config().baseUrl}/`);

  // 4) Espera o dashboard completar o carregamento básico
  cy.wait('@getPosts', { timeout: 15000 });

  // 5) Valida persistência na UI (Navbar é o lugar certo pra isso)
  cy.get('nav', { timeout: 10000 }).should('contain', 'Ricardo');
});

});
