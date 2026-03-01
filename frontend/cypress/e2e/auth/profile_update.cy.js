describe('Upload de Foto de Perfil (Mock API)', () => {
  const PHOTO_URL =
    'https://cdn.fake/mindly/profile_pictures/test.jpg';

  const visitAuthed = (path = '/settings') => {
    cy.visit(path, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token-123');
        win.localStorage.setItem('refresh', 'fake-refresh-123');
      },
    });
  };

  beforeEach(() => {
    cy.clearLocalStorage();
    cy.clearCookies();

    // 1) Mock GET profile (carrega tela)
    cy.intercept('GET', '**/accounts/profile/**', {
      statusCode: 200,
      body: {
        id: 1,
        username: 'cristiano',
        display_name: 'Cristiano Tobias',
        profile_picture: null,
      },
    }).as('getProfile');

    // 2) Mock PATCH upload (o que hoje dá 401 no backend real)
    cy.intercept('PATCH', '**/accounts/profile/**', (req) => {
      // opcional: valida que é multipart/form-data
      // (nem sempre aparece claro no Cypress; não força)
      expect(req.headers).to.have.property('authorization');

      req.reply({
        statusCode: 200,
        body: {
          id: 1,
          username: 'cristiano',
          display_name: 'Cristiano Tobias',
          profile_picture: PHOTO_URL,
        },
      });
    }).as('updateProfile');

    // 3) Se a tela também chama notificações, mocka pra não “sujar” o teste
    cy.intercept('GET', '**/notifications/**', { statusCode: 200, body: [] }).as(
      'getNotifications'
    );

    visitAuthed('/settings');
    cy.wait(['@getProfile', '@getNotifications'], { timeout: 20000 });
  });

  it('Deve trocar a foto de perfil com sucesso', () => {
    cy.get('form', { timeout: 15000 }).should('be.visible');

    cy.get('[data-cy="profile-file-input"]').selectFile(
      {
        contents: Cypress.Buffer.from('imagem-teste-e2e'),
        fileName: 'foto.jpg',
        mimeType: 'image/jpeg',
      },
      { force: true }
    );

    cy.get('[data-cy="settings-submit-button"]').click();

    cy.wait('@updateProfile')
      .its('response.statusCode')
      .should('be.oneOf', [200, 201]);

    cy.get('[data-cy="settings-status-message"]')
      .should('be.visible')
      .and('contain', 'successfully');

    // opcional: se a UI renderiza a imagem retornada
    // ajuste o seletor conforme teu componente
    cy.get('img')
      .should('have.attr', 'src')
      .and('include', 'profile_pictures');
  });
});