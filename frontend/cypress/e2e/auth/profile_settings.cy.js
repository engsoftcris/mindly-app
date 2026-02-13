describe('Profile Settings & Real-time Sync (UUID Era)', () => {
  const MOCK_UUID = 'b369ce73-66ba-4dc9-a736-d79eb3e45e5b';
  const USERNAME = 'cristiano.tobias40';

  beforeEach(() => {
    // 1. Mock inicial: Perfil carregando como "Cristiano Original"
    cy.intercept('GET', /.*accounts\/profile.*/, {
      statusCode: 200,
      body: {
        id: MOCK_UUID,
        username: USERNAME,
        display_name: 'Cristiano Original',
        bio: 'Bio antiga...',
        profile_picture: 'https://ui-avatars.com/api/?name=Cristiano&background=0D8ABC&color=fff'
      }
    }).as('getProfileMe');

    // 2. Prepara o token de acesso
    cy.window().then((win) => {
      win.localStorage.clear();
      win.localStorage.setItem('access', 'fake-token-123');
    });

    // 3. Visita a página
    cy.visit('/profile');
    cy.wait('@getProfileMe');
  });

  it('1. Deve exibir o nome "Cristiano" na Navbar (vido do display_name)', () => {
    // Verifica se o seu split(' ')[0] funcionou e pegou o primeiro nome do mock
    cy.get('nav', { timeout: 10000 }).should('contain', 'Cristiano');
    cy.get('nav').should('not.contain', USERNAME); // Garante que NÃO está mostrando o username
  });

  it('2. Sync Test: Deve atualizar para "Ricardo" e refletir na Navbar instantaneamente', () => {
    const newFullName = 'Ricardo Silva Pro';
    const expectedFirstName = 'Ricardo';

    // Interceptamos o PATCH para responder com o novo nome "Ricardo"
    cy.intercept('PATCH', /.*accounts\/profile.*/, {
      statusCode: 200,
      body: {
        id: MOCK_UUID,
        username: USERNAME,
        display_name: newFullName,
        bio: 'Nova bio do Ricardo'
      }
    }).as('updateToRicardo');

    // Forçamos o Mock do GET a retornar Ricardo também (para navegação posterior)
    cy.intercept('GET', /.*accounts\/profile.*/, {
      statusCode: 200,
      body: {
        id: MOCK_UUID,
        username: USERNAME,
        display_name: newFullName
      }
    }).as('getProfileRicardo');

    // Ação: Altera o nome no input
    cy.get('input').filter(':not([disabled])').first().clear().type(newFullName);
    cy.get('button[type="submit"]').click();

    // Espera a API confirmar o sucesso
    cy.wait('@updateToRicardo');

    // Validação de Feedback
    cy.contains('Profile updated successfully!').should('be.visible');

    // Validação de Sincronização (A "Prova Real")
    // O timeout de 10s dá tempo para o AuthContext atualizar o estado do user
    cy.get('nav', { timeout: 10000 })
      .should('contain', expectedFirstName)
      .and('not.contain', 'Cristiano'); 
  });

  it('3. Persistência: Deve manter o nome "Ricardo" ao navegar para o Dashboard', () => {
    const ricardoName = 'Ricardo';

    // Mock para garantir que ao mudar de página o app receba o nome atualizado
    cy.intercept('GET', /.*accounts\/profile.*/, {
      statusCode: 200,
      body: { 
        id: MOCK_UUID, 
        username: USERNAME, 
        display_name: 'Ricardo Silva Pro' 
      }
    }).as('getFinalState');

    // Clica no link da Logo ou Home na Nav
    cy.get('nav a').first().click();
    
    // Valida URL
    cy.url().should('eq', Cypress.config().baseUrl + '/');
    
    // Espera o Dashboard carregar os dados
    cy.wait('@getFinalState');

    // Verifica se o nome "Ricardo" persiste na página inicial
    cy.get('body').should('contain', ricardoName);
  });
});