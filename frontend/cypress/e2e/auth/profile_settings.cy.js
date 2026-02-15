describe('Profile Settings & Real-time Sync (UUID Era) - Robust Version', () => {
  const MOCK_UUID = 'b369ce73-66ba-4dc9-a736-d79eb3e45e5b';
  const USERNAME = 'cristiano.tobias40';

  beforeEach(() => {
    // 1. Mock inicial do Perfil
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

    // 2. Prepara o estado inicial
    cy.window().then((win) => {
      win.localStorage.clear();
      win.localStorage.setItem('access', 'fake-token-123');
    });

    // 3. Visita a página com timeout de rede
    cy.visit('/profile', { timeout: 15000 });
    cy.wait('@getProfileMe', { timeout: 10000 });
  });

 it('1. Deve exibir o nome "Cristiano" na Navbar (extraído do display_name)', () => {
    // Forçamos uma resolução de tela larga para o Tailwind aplicar o 'xl:block'
    cy.viewport(1280, 800); 

    // Agora o parágrafo deve estar visível
    cy.get('nav p.text-white', { timeout: 12000 })
      .should('be.visible')
      .and('contain', 'Cristiano');
    
    // O username aparece na parte cinza
    cy.get('nav p.text-gray-500').should('be.visible').and('contain', USERNAME);
    
    // Garante que o sobrenome foi cortado
    cy.get('nav p.text-white').should('not.contain', 'Original');
  });

  it('2. Sync Test: Deve atualizar para "Ricardo" e refletir na Navbar instantaneamente', () => {
    const newFullName = 'Ricardo Silva Pro';
    const expectedFirstName = 'Ricardo';

    cy.intercept('PATCH', /.*accounts\/profile.*/, {
      statusCode: 200,
      body: {
        id: MOCK_UUID,
        username: USERNAME,
        display_name: newFullName,
        bio: 'Nova bio do Ricardo'
      }
    }).as('updateToRicardo');

    // Mock do GET atualizado para navegação futura
    cy.intercept('GET', /.*accounts\/profile.*/, {
      statusCode: 200,
      body: { id: MOCK_UUID, username: USERNAME, display_name: newFullName }
    }).as('getProfileRicardo');

    // Interação com o Input (Garantindo que está pronto para receber texto)
    cy.get('input').filter(':not([disabled])').first()
      .should('be.visible')
      .clear()
      .type(newFullName, { delay: 50 }); // Delay suave para estabilidade no Firefox

    cy.get('button[type="submit"]').click();

    // Espera a API confirmar (timeout estendido para 15s)
    cy.wait('@updateToRicardo', { timeout: 15000 });

    // Validação de Feedback Visual
    cy.contains('Profile updated successfully!', { timeout: 10000 }).should('be.visible');

    // Validação de Sincronização em Tempo Real na Nav
    cy.get('nav', { timeout: 12000 })
      .should('contain', expectedFirstName)
      .and('not.contain', 'Cristiano'); 
  });

  it('3. Persistência: Deve manter o nome "Ricardo" ao navegar para o Dashboard', () => {
    const ricardoName = 'Ricardo';

    cy.intercept('GET', /.*accounts\/profile.*/, {
      statusCode: 200,
      body: { id: MOCK_UUID, username: USERNAME, display_name: 'Ricardo Silva Pro' }
    }).as('getFinalState');

    // Clique forçado para evitar que animações de CSS bloqueiem o link
    cy.get('nav a').first().click({ force: true });
    
    // Valida URL e carregamento da página inicial
    cy.url({ timeout: 10000 }).should('eq', Cypress.config().baseUrl + '/');
    
    // Espera o Dashboard carregar os dados reais
    cy.wait('@getFinalState', { timeout: 10000 });

    // Verifica persistência no body da página
    cy.get('body', { timeout: 10000 }).should('contain', ricardoName);
  });
});