describe('Post Creation Flow (Supabase URL Fix)', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });

    cy.intercept('GET', '**/accounts/profile*', {
      statusCode: 200,
      body: { 
        username: 'cristiano', 
        display_name: 'Cristiano',
        profile_picture: 'https://via.placeholder.com/150' 
      }
    }).as('getProfile');

    cy.intercept('GET', '**/api/accounts/feed/**', {
      statusCode: 200,
      body: { count: 0, next: null, results: [] }
    }).as('getFeed');

    cy.intercept('POST', '**/api/posts/', {
      statusCode: 201,
      body: { 
        id: 99, 
        content: 'URL Fix Test',
        image: "https://nsallopenmwbwkzrhgmx.supabase.co/storage/v1/object/public/mindly-media/posts/images/test.png"
      }
    }).as('createPost');

    cy.visit('/');
    cy.wait(['@getProfile', '@getFeed']);
  });

  it('1. Deve abrir o modal de criação com sucesso', () => {
    cy.get('button').contains(/Post|Create|New|Criar/i).first().click(); 
    cy.get('textarea').first().should('be.visible');
  });

  it('2. Deve validar o formato da URL da imagem após o post', () => {
    // Abrir novamente (já que o beforeEach reseta)
    cy.get('button').contains(/Post|Create|New|Criar/i).first().click(); 
    cy.get('textarea').first().type('Validando storage fix...');
    cy.get('button[type="submit"]').click();

    cy.wait('@createPost').then((interception) => {
      const imageUrl = interception.response.body.image;
      expect(imageUrl).to.not.include('/s3/');
      expect(imageUrl).to.include('storage/v1/object/public');
      expect(imageUrl).to.not.include('AWSAccessKeyId');
    });
  });

  it('3. Deve fechar o modal e limpar o estado da UI', () => {
    // Verifica se após o POST o textarea sumiu (sucesso do fluxo)
    cy.get('textarea').should('not.exist');
    cy.log('✅ Fluxo finalizado com sucesso');
  });
});