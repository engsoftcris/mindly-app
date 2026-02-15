import React from 'react';
import CreatePost from './CreatePost';
import AuthContext from '../context/AuthContext';

describe('<CreatePost />', () => {
  let onPostCreatedSpy;

  // Mock dos dados que o useAuth() precisa para não quebrar
  const mockAuthValue = {
    user: {
      username: 'cristiano',
      profile_picture: 'https://via.placeholder.com/150'
    }
  };

  beforeEach(() => {
    // Criamos um "espião" para a função de callback
    onPostCreatedSpy = cy.spy().as('onPostCreatedSpy');

    // Interceptamos a chamada da API (axios)
    cy.intercept('POST', '**/posts/', {
      statusCode: 201,
      body: { id: 1, content: 'Texto do post', author: { username: 'cristiano' } }
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

    // 1. Verifica se o avatar carregou do contexto
    cy.get('img[alt="avatar"]')
      .should('be.visible')
      .and('have.attr', 'src', mockAuthValue.user.profile_picture);

    // 2. Verifica o placeholder (usando have.attr que é o correto)
    cy.get('textarea')
      .should('have.attr', 'placeholder', "What's on your mind?");

    // 3. Digita texto e verifica o contador
    const texto = 'Testando o Mindly!';
    cy.get('textarea').type(texto);
    cy.contains(`${texto.length}/280`).should('be.visible');

    // 4. Clica em Post e verifica se chamou a API e o callback
    cy.get('button').contains('Post').click();
    
    cy.wait('@createPostRequest');
    
    // O campo deve ser limpo após o sucesso (resetState)
    cy.get('textarea').should('have.value', '');
    
    // A função pai deve ter sido chamada
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
    cy.get('textarea').type(longText, { delay: 0 }); // delay 0 para ser rápido
    
    cy.get('button').contains('Post').should('be.disabled');
    cy.contains('281/280').should('have.class', 'text-red-500');
  });
  it('Deve mostrar preview de vídeo ao selecionar um arquivo .mp4', () => {
    cy.mount(
      <AuthContext.Provider value={mockAuthValue}>
        <div className="bg-black p-4">
          <CreatePost onPostCreated={onPostCreatedSpy} />
        </div>
      </AuthContext.Provider>
    );

    // Simula a seleção de um vídeo
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('video-fake-content'),
      fileName: 'video_aula.mp4',
      mimeType: 'video/mp4' // Isso faz o media.type.startsWith('video') ser verdadeiro
    }, { force: true });

    // Verifica se a tag <video> apareceu (em vez da tag <img>)
    cy.get('video').should('be.visible');
    
    // Verifica se o botão de remover (X) funciona no vídeo
    cy.get('button').contains('✕').click();
    cy.get('video').should('not.exist');
  });
});