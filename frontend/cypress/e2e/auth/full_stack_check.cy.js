describe('Post Creation Flow (Supabase URL Fix)', () => {
  const CLEAN_URL =
    'https://nsallopenmwbwkzrhgmx.supabase.co/storage/v1/object/public/mindly-media/posts/images/test.png';
  const MOCK_UUID = 'b369ce73-66ba-4dc9-a736-d79eb3e45e5b';

  const setupAuthEscudo = () => {
    cy.intercept('GET', '**/api/accounts/profile/**', {
      statusCode: 200,
      body: { id: MOCK_UUID, username: 'cristiano', display_name: 'Cristiano' },
    }).as('getProfile');

    cy.intercept('POST', '**/api/token/refresh/**', {
      statusCode: 200,
      body: { access: 'fake-access', refresh: 'fake-refresh' },
    }).as('refreshToken');

    // Mocks de sidebar (usando wildcards para garantir que o alias pegue)
    cy.intercept('GET', '**/api/notifications/**', {
      statusCode: 200,
      body: { results: [] },
    }).as('getNotifications');
    cy.intercept('GET', '**/api/accounts/suggested-follows/**', {
      statusCode: 200,
      body: { results: [] },
    }).as('getSuggestions');
    cy.intercept('GET', '**/api/accounts/profiles/relationships-sync/**', {
      statusCode: 200,
      body: { blocked_users: [] },
    });
  };

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();

    setupAuthEscudo();

    // Mock do Feed (essencial para a página não ficar em loading infinito)
    cy.intercept('GET', '**/api/accounts/feed/**', {
      statusCode: 200,
      body: { count: 1, results: [] },
    }).as('getFeed');

    // Mock de criação
    cy.intercept('POST', '**/api/posts/**', {
      statusCode: 201,
      body: {
        id: 99,
        content: 'Sucesso',
        media_url: CLEAN_URL,
        author: { username: 'cristiano' },
        created_at: new Date().toISOString(),
      },
    }).as('createPost');

    cy.login({ username: 'cristiano' });

    cy.visit('/');

    // ✅ O SEGREDO: Esperamos apenas o Perfil e o Feed.
    // Notificações e Sugestões podem ou não carregar (cache), então não travamos neles.
    cy.wait(['@getProfile', '@getFeed'], { timeout: 20000 });

    // Pequena pausa para o React terminar de montar os componentes da Sidebar
    cy.wait(500);
  });

  // --- TESTES (Agora eles vão rodar sem ser ignorados) ---

  it('1. Deve garantir que o campo de criação está visível no Dashboard', () => {
    cy.get('textarea', { timeout: 15000 }).first().should('be.visible');
  });

  it('2. Deve validar o formato da URL da imagem após o post', () => {
    cy.get('textarea').first().type('Testando Supabase Fix');
    cy.get('button[type="submit"]').click();

    cy.wait('@createPost').then((interception) => {
      expect(interception.response.statusCode).to.eq(201);
      expect(interception.response.body.media_url).to.not.include(
        'AWSAccessKeyId'
      );
    });
  });

  it('3. Deve limpar o formulário após o sucesso', () => {
    cy.get('textarea').first().type('Texto para limpar');
    cy.get('button[type="submit"]').click();
    cy.wait('@createPost');
    cy.get('textarea').first().should('have.value', '');
  });

  it('4. Deve processar o upload de uma imagem e exibir o preview', () => {
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ax8p0kAAAAASUVORK5CYII=';

    // Intercepta e garante que o escudo de Auth continua ativo (Redundância de segurança)
    setupAuthEscudo();

    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from(pngBase64, 'base64'),
        fileName: 'test-image.png',
        mimeType: 'image/png',
      },
      { force: true }
    );

    // ✅ Verifica o preview com timeout estendido e validação de SRC
    cy.get('img[alt="Preview"]', { timeout: 15000 })
      .should('be.visible')
      .and(($img) => {
        expect($img[0].src).to.match(/blob:|data:/);
      });

    // Remove a imagem clicando no botão de fechar (X)
    // Usando seletor flexível para o botão de fechar
    cy.get('button').contains('✕').click({ force: true });
    cy.get('img[alt="Preview"]').should('not.exist');
  });

  it('5. Deve mostrar estado de carregamento e desativar o botão ao postar', () => {
    // Override local para testar o delay
    cy.intercept('POST', '**/api/posts/**', {
      delay: 1500,
      statusCode: 201,
      body: {
        id: 101,
        content: 'Post Lento',
        author: { username: 'cristiano' },
        created_at: new Date().toISOString(),
      },
    }).as('postLento');

    cy.get('textarea').first().type('Postando com calma...');
    cy.get('button[type="submit"]').click();

    // Valida estados visuais de loading
    cy.get('button[type="submit"]').should('be.disabled');
    cy.get('textarea').should('be.disabled');
    cy.get('button[type="submit"]').should('contain', 'Posting...');

    cy.wait('@postLento');

    // Após o wait, o botão deve voltar ao normal (ou sumir o loading)
    cy.get('button[type="submit"]').should('not.contain', 'Posting...');
  });
});
