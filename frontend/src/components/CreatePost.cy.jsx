import React from 'react';
import CreatePost from './CreatePost';
import AuthContext from '../context/AuthContext';

describe('<CreatePost /> - Blindado', () => {
  let onPostCreatedSpy;

  const mockAuthValue = {
    user: {
      username: 'cristiano',
      profile_picture: 'https://via.placeholder.com/150',
    },
  };

  beforeEach(() => {
    onPostCreatedSpy = cy.spy().as('onPostCreatedSpy');

    cy.intercept('POST', '**/posts/', {
      statusCode: 201,
      body: {
        id: 1,
        content: 'Texto do post',
        author: { username: 'cristiano' },
      },
    }).as('createPostRequest');
  });

  it('Deve renderizar, digitar texto e enviar o post com sucesso', () => {
    cy.mount(
      <AuthContext.Provider value={mockAuthValue}>
        <div className="bg-black p-4">
          <CreatePost onPostCreated={onPostCreatedSpy} />
        </div>
      </AuthContext.Provider>
    );

    // 1. Verifica avatar via data-cy
    cy.getByData('user-avatar').should(
      'have.attr',
      'src',
      mockAuthValue.user.profile_picture
    );

    // 2. Digita texto
    const texto = 'Testando o Mindly!';
    cy.getByData('post-textarea').type(texto);

    // 3. Valida contador
    cy.getByData('char-counter').should('contain', `${texto.length}/280`);

    // 4. Envia
    cy.getByData('post-submit').click();

    cy.wait('@createPostRequest');
    cy.getByData('post-textarea').should('have.value', '');
    cy.get('@onPostCreatedSpy').should('have.been.called');
  });

  it('Deve desabilitar o botão se o texto passar de 280 caracteres', () => {
    cy.mount(
      <AuthContext.Provider value={mockAuthValue}>
        <div className="bg-black p-4">
          <CreatePost onPostCreated={onPostCreatedSpy} />
        </div>
      </AuthContext.Provider>
    );

    const longText = 'a'.repeat(281);
    cy.getByData('post-textarea').type(longText, { delay: 0 });

    cy.getByData('post-submit').should('be.disabled');
    cy.getByData('char-counter').should('have.class', 'text-red-500');
  });

  it('Deve mostrar preview de vídeo ao selecionar um arquivo .mp4', () => {
    cy.mount(
      <AuthContext.Provider value={mockAuthValue}>
        <div className="bg-black p-4">
          <CreatePost onPostCreated={onPostCreatedSpy} />
        </div>
      </AuthContext.Provider>
    );

    // Seleção de vídeo usando o input de arquivo
    cy.getByData('file-input').selectFile(
      {
        contents: Cypress.Buffer.from('video-fake-content'),
        fileName: 'video_aula.mp4',
        mimeType: 'video/mp4',
      },
      { force: true }
    );

    cy.getByData('video-preview').should('be.visible');

    // Remove o vídeo
    cy.getByData('remove-media').click();
    cy.getByData('video-preview').should('not.exist');
  });
});
