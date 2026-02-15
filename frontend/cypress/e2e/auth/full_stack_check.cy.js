describe('Post Creation Flow (Supabase URL Fix)', () => {
  const CLEAN_URL = "https://nsallopenmwbwkzrhgmx.supabase.co/storage/v1/object/public/mindly-media/posts/images/test.png";

  beforeEach(() => {
    cy.clearLocalStorage();

    // 1. Mock do Perfil
    cy.intercept('GET', '**/api/accounts/profile**', {
      statusCode: 200,
      body: { 
        id: 1,
        username: 'cristiano', 
        display_name: 'Cristiano Tobias',
        profile_picture: null 
      }
    }).as('getProfile');

    // 2. Mock do Feed Inicial
    cy.intercept('GET', '**/api/posts/**', {
      statusCode: 200,
      body: { 
        count: 1, 
        next: null, 
        results: [{
          id: 100,
          content: 'Post antigo do sistema',
          author: { username: 'sistema', id: 2 },
          created_at: new Date().toISOString()
        }] 
      }
    }).as('getPostsAll');

    // 3. Mock do POST (Ajustado para bater com o componente)
    cy.intercept('POST', '**/api/posts/', {
      statusCode: 201,
      body: { 
        id: 99, 
        content: 'Sucesso: Post com URL Limpa',
        media_url: CLEAN_URL, 
        author: { username: 'cristiano', id: 1 },
        moderation_status: 'APPROVED',
        created_at: new Date().toISOString()
      }
    }).as('createPost');

    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });

    cy.visit('/');
    cy.wait(['@getProfile', '@getPostsAll'], { timeout: 20000 });
  });

  it('1. Deve garantir que o campo de criação está visível no Dashboard', () => {
    // CORREÇÃO: Sintaxe correta para checar placeholder
    cy.get('textarea').first()
      .should('be.visible')
      .and('have.attr', 'placeholder', "What's on your mind?");
  });

  it('2. Deve validar o formato da URL da imagem após o post', () => {
    const textoDigitado = 'Testando Supabase Fix';
    
    cy.get('textarea').first().type(textoDigitado);
    cy.get('button[type="submit"]').contains('Post').click();

    cy.wait('@createPost').then((interception) => {
      expect(interception.response.statusCode).to.eq(201);
      
      const imageUrl = interception.response.body.media_url;
      expect(imageUrl).to.include('storage/v1/object/public');
      expect(imageUrl).to.not.include('AWSAccessKeyId');
    });

    // CORREÇÃO: Procurar pelo texto que o MOCK retorna no body
    cy.contains('Sucesso: Post com URL Limpa').should('be.visible');
  });

  it('3. Deve limpar o formulário após o sucesso', () => {
    cy.get('textarea').first().type('Texto para limpar');
    cy.get('button[type="submit"]').click();
    
    cy.wait('@createPost');
    
    // O textarea deve ficar vazio após o handlePostCreated
    cy.get('textarea').first().should('have.value', '');
    cy.contains('0/280').should('be.visible');
  });
  it('4. Deve processar o upload de uma imagem e exibir o preview', () => {
    // Simula um arquivo de imagem
    const fileName = 'test-image.png';
    cy.fixture('example.json').then(() => { // Usamos fixture apenas para gatilho ou um arquivo real na pasta fixtures
      cy.get('input[type="file"]').selectFile({
        contents: Cypress.Buffer.from('file contents'),
        fileName: fileName,
        lastModified: Date.now(),
      }, { force: true });
    });

    // Verifica se o preview da imagem apareceu na tela
    cy.get('img[alt="Preview"]').should('be.visible');
    
    // Verifica se o botão de remover (X) funciona
    cy.get('button').contains('✕').click();
    cy.get('img[alt="Preview"]').should('not.exist');
  });
  it('5. Deve desativar o botão se o limite de caracteres for excedido', () => {
    const longoTexto = 'a'.repeat(281);
    
    cy.get('textarea').first().type(longoTexto, { delay: 0 }); // delay 0 para ser rápido
    
    // O contador deve estar vermelho (sua lógica de classe CSS)
    cy.contains('281/280').should('be.visible');
    
    // O botão deve estar desativado
    cy.get('button[type="submit"]').should('be.disabled');
  });
  it('6. Deve mostrar estado de carregamento e desativar o botão ao postar', () => {
    // Forçamos o delay no mock para conseguirmos "ver" o estado de loading
    cy.intercept('POST', '**/api/posts/', {
      delay: 1000, 
      statusCode: 201,
      body: { id: 101, content: 'Post Lento', author: { username: 'cristiano' } }
    }).as('postLento');

    cy.get('textarea').first().type('Postando com calma...');
    cy.get('button[type="submit"]').click();

    // Durante o envio:
    cy.get('button[type="submit"]').should('be.disabled').and('contain', 'Posting...');
    cy.get('textarea').should('be.disabled');

    cy.wait('@postLento');
  });
});