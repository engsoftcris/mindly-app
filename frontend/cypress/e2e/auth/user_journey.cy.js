// Impede que erros do SDK do Google (como falta de client_id real) quebrem o teste
Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

describe('Fluxo de Login Social (Página de Login)', () => {
  it('Deve exibir o botão de Login do Google', () => {
    cy.visit('/login');
    cy.contains('button', /Google/i).should('be.visible');
  });

  it('Deve permitir que o utilizador clique no botão de Google', () => {
    cy.visit('/login');
    cy.get('button').contains(/Google/i).should('not.be.disabled');
  });
});

describe('Fluxo do Dashboard (Utilizador Autenticado)', () => {
  beforeEach(() => {
    cy.clearLocalStorage();

    // Mock da API - Ajustado para ser mais flexível com a URL
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

    // Injeta o token antes de visitar a página
    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });
  });

  it('Deve carregar o Dashboard e mostrar as informações do utilizador', () => {
    cy.visit('/');
    // Adicionamos um timeout maior para o CI não dar gargalo
    cy.wait('@getProfile', { timeout: 10000 });

    cy.get('h1', { timeout: 10000 }).should('contains.text', 'Teste Cypress');
    cy.get('img[alt="Profile"]').should('be.visible');
    cy.contains(/social feed/i).should('be.visible');
  });

  it('Deve realizar o logout através do botão do Dashboard', () => {
    cy.visit('/');
    cy.wait('@getProfile', { timeout: 10000 });

    cy.get('button').contains(/Logout|Sign Out|Sair/i).click();

    cy.window().should((win) => {
      expect(win.localStorage.getItem('access')).to.be.null;
    });
    cy.url().should('include', '/login');
  });
});

describe('Segurança de Acesso (Privacidade)', () => {
  it('Deve redirecionar para /login ao tentar aceder à raiz sem estar autenticado', () => {
    cy.clearLocalStorage();
    cy.visit('/'); 
    cy.url().should('include', '/login');
  });
  describe('Post Creation Flow (Media Support)', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });

    cy.intercept('GET', '**/accounts/profile*', {
      statusCode: 200,
      body: { username: 'cristiano', full_name: 'Cristiano' }
    }).as('getProfile');

    // MOCK THE POSTS LIST TO AVOID 401 ERRORS
    cy.intercept('GET', '**/posts/', {
      statusCode: 200,
      body: [] 
    }).as('getPosts');

    cy.intercept('POST', '**/posts/', {
      statusCode: 201,
      body: { id: 99, content: 'Success!' }
    }).as('createPost');

    cy.visit('/');
    cy.wait('@getProfile');
  });

  it('Should allow a user to upload a video and write content', () => {
    // 1. Open Modal - Using a more generic selector
    cy.get('button').contains(/Post|Create|New/i).click(); 

    // 2. Type
    const postContent = 'This is a Cypress automated test post.';
    cy.get('textarea').first().type(postContent);

    // 3. Upload
    const fileName = 'test-video.mp4';
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('fake-video-data'),
      fileName: fileName,
    }, { force: true });

    // 4. Submit
    cy.get('button[type="submit"]').click();

    // 5. Verify status instead of body.get()
    cy.wait('@createPost').its('response.statusCode').should('eq', 201);

    // 6. Check if modal closed
    cy.get('textarea').should('not.exist');
  });
});
});

