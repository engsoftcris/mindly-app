// Impede que erros do SDK do Google quebrem o teste
Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

describe('Fluxo de Login Social (Página de Login)', () => {
  it('Deve exibir o botão de Login do Google', () => {
    cy.visit('/login', { timeout: 15000 });
    cy.contains('button', /Google/i, { timeout: 10000 }).should('be.visible');
  });

  it('Deve permitir que o utilizador clique no botão de Google', () => {
    cy.visit('/login');
    cy.get('button').contains(/Google/i).should('not.be.disabled');
  });
});

describe('Fluxo do Dashboard (Utilizador Autenticado)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();

    cy.intercept('GET', '**/accounts/profile*', {
      statusCode: 200,
      body: {
        username: 'testuser',
        full_name: 'Teste Cypress',
        profile_picture: 'https://via.placeholder.com/150',
        provider: 'google',
        is_private: true
      }
    }).as('getProfile');

    // MOCK DO FEED para evitar o erro 401 que vimos antes
    cy.intercept('GET', '**/accounts/feed/**', {
        statusCode: 200,
        body: { count: 0, next: null, results: [] }
    }).as('getFeed');

    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });
  });

  it('Deve carregar o Dashboard e mostrar as informações do utilizador', () => {
    cy.visit('/', { timeout: 20000 });
    // Espera perfil e feed com folga para o Firefox
    cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 });

    cy.get('h1', { timeout: 12000 }).should('contains.text', 'Seu Mundo Mindly');
    cy.get('img[alt="Profile"]', { timeout: 10000 }).should('be.visible');
    cy.contains(/Network Feed/i, { timeout: 10000 }).should('be.visible');
  });

  it('Deve realizar o logout através do botão do Dashboard', () => {
    cy.visit('/');
    cy.wait(['@getProfile', '@getFeed'], { timeout: 15000 });

    // Clique forçado caso haja animação de fade-in no Dashboard
    cy.get('button').contains(/Logout|Sign Out|Sair/i).click({ force: true });

    cy.window().should((win) => {
      expect(win.localStorage.getItem('access')).to.be.null;
    });
    cy.url({ timeout: 10000 }).should('include', '/login');
  });
});

describe('Segurança e Postagem (Media)', () => {
  it('Deve redirecionar para /login ao tentar aceder à raiz sem estar autenticado', () => {
    cy.clearLocalStorage();
    cy.visit('/', { failOnStatusCode: false }); 
    cy.url({ timeout: 12000 }).should('include', '/login');
  });

  describe('Sub-fluxo: Criação de Post com Vídeo', () => {
    beforeEach(() => {
      cy.window().then((win) => {
        win.localStorage.setItem('access', 'fake-token-123');
      });

      cy.intercept('GET', '**/accounts/profile*', {
        statusCode: 200,
        body: { username: 'cristiano', full_name: 'Cristiano' }
      }).as('getProfileMedia');

      cy.intercept('GET', '**/posts/', { statusCode: 200, body: [] }).as('getPosts');
      
      cy.intercept('POST', '**/posts/', {
        statusCode: 201,
        body: { id: 99, content: 'Success!' }
      }).as('createPostMedia');

      cy.visit('/');
      cy.wait('@getProfileMedia', { timeout: 15000 });
    });

    it('Deve permitir carregar um vídeo e escrever conteúdo', () => {
      // 1. Abrir Modal
      cy.get('button').contains(/Post|Create|New|Criar/i).first().click({ force: true }); 

      // 2. Escrever (com delay para o Firefox)
      cy.get('textarea', { timeout: 10000 })
        .should('be.visible')
        .type('Teste automatizado com vídeo.', { delay: 30 });

      // 3. Upload de Arquivo (Simulado)
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('fake-video-data'),
        fileName: 'test-video.mp4',
      }, { force: true });

      // 4. Submit
      cy.get('button[type="submit"]').click();

      // 5. Validação
      cy.wait('@createPostMedia', { timeout: 15000 }).its('response.statusCode').should('eq', 201);

      // 6. Check de UI
      cy.get('textarea', { timeout: 10000 }).should('not.exist');
    });
  });
});