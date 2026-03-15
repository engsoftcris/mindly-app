describe('Upload de Foto de Perfil (Mock API)', () => {
  const PHOTO_URL = 'https://cdn.fake/mindly/profile_pictures/test.jpg';

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

    cy.intercept('GET', '**/api/accounts/profile/**', {
      statusCode: 200,
      body: {
        id: 1,
        username: 'cristiano',
        display_name: 'Cristiano Tobias',
        profile_picture: null,
      },
    }).as('getProfile');

    cy.intercept('PATCH', '**/api/accounts/profile/**', (req) => {
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

    cy.intercept('GET', '**/api/notifications/**', { statusCode: 200, body: [] }).as(
      'getNotifications'
    );

    visitAuthed('/settings');
    cy.wait(['@getProfile', '@getNotifications'], { timeout: 20000 });
  });

  it('1. Deve trocar a foto de perfil com sucesso', () => {
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
    cy.wait('@updateProfile').its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.get('[data-cy="settings-status-message"]')
      .should('be.visible')
      .and('contain', 'successfully');
    cy.get('img').should('have.attr', 'src').and('include', 'profile_pictures');
  });

  it('2. Deve mostrar erro ao tentar upload de arquivo inválido', () => {
    cy.intercept('PATCH', '**/api/accounts/profile/**', {
      statusCode: 400,
      body: {
        error: 'Invalid file format. Only images are allowed.'
      }
    }).as('updateProfileError');

    cy.get('[data-cy="profile-file-input"]').selectFile(
      {
        contents: Cypress.Buffer.from('fake-pdf-data'),
        fileName: 'documento.pdf',
        mimeType: 'application/pdf',
      },
      { force: true }
    );

    cy.get('[data-cy="settings-submit-button"]').click();
    cy.wait('@updateProfileError', { timeout: 10000 });
    cy.get('[data-cy="settings-status-message"]')
      .should('be.visible')
      .and('contain', 'Failed to update settings');
  });

  it('3. Deve mostrar erro de tamanho máximo excedido', () => {
    cy.intercept('PATCH', '**/api/accounts/profile/**', {
      statusCode: 413,
      body: {
        error: 'File too large. Maximum size is 5MB.'
      }
    }).as('updateProfileSizeError');

    const largeFile = Buffer.alloc(10 * 1024 * 1024, 'a');

    cy.get('[data-cy="profile-file-input"]').selectFile(
      {
        contents: largeFile,
        fileName: 'foto-grande.jpg',
        mimeType: 'image/jpeg',
      },
      { force: true }
    );

    cy.get('[data-cy="settings-submit-button"]').click();
    cy.wait('@updateProfileSizeError', { timeout: 10000 });
    cy.get('[data-cy="settings-status-message"]')
      .should('be.visible')
      .and('contain', 'Failed to update settings');
  });

  it('4. Deve manter o estado disabled durante o upload', () => {
    cy.intercept('PATCH', '**/api/accounts/profile/**', {
      delay: 3000,
      statusCode: 200,
      body: {
        id: 1,
        username: 'cristiano',
        display_name: 'Cristiano Tobias',
        profile_picture: PHOTO_URL,
      },
    }).as('updateProfileSlow');

    cy.get('[data-cy="profile-file-input"]').selectFile(
      {
        contents: Cypress.Buffer.from('imagem-teste-e2e'),
        fileName: 'foto.jpg',
        mimeType: 'image/jpeg',
      },
      { force: true }
    );

    cy.get('[data-cy="settings-submit-button"]').click();
    
    cy.get('[data-cy="settings-submit-button"]')
      .should('be.disabled')
      .and('contain', 'Saving...');

    cy.wait('@updateProfileSlow');
    cy.get('[data-cy="settings-submit-button"]').should('not.be.disabled');
    cy.get('[data-cy="settings-status-message"]')
      .should('be.visible')
      .and('contain', 'successfully');
  });

  it('5. Deve mostrar preview da imagem antes do upload', () => {
    cy.get('[data-cy="profile-file-input"]').selectFile(
      {
        contents: Cypress.Buffer.from('imagem-teste-e2e'),
        fileName: 'foto.jpg',
        mimeType: 'image/jpeg',
      },
      { force: true }
    );

    cy.wait(1000);

    // Verifica que o preview apareceu (imagem com classe w-28)
    cy.get('img.w-28.h-28', { timeout: 5000 })
      .should('be.visible')
      .and('have.attr', 'src')
      .and('include', 'blob:');
  });
});