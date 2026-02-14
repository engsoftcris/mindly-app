import React from 'react';
import CreatePostModal from './CreatePostModal';

describe('<CreatePostModal /> - Component Testing', () => {
  // Criamos as variáveis aqui em cima para serem acessíveis em todos os testes
  let refreshPostsSpy;
  let onCloseSpy;

  beforeEach(() => {
    // Inicializamos os spies dentro do beforeEach
    refreshPostsSpy = cy.spy().as('refreshPostsSpy');
    onCloseSpy = cy.spy().as('onCloseSpy');

    // Interceptamos a API para evitar chamadas reais ao backend
    cy.intercept('POST', '**/posts/', {
      statusCode: 201,
      body: { message: 'Post created successfully!' }
    }).as('createPostRequest');
  });

  const mountModal = (isOpen = true) => {
    cy.mount(
      <div id="modal-container" className="h-screen w-full bg-gray-900">
        <CreatePostModal 
          isOpen={isOpen} 
          onClose={onCloseSpy} 
          refreshPosts={refreshPostsSpy} 
        />
      </div>
    );
  };

  it('1. Não deve renderizar o modal quando isOpen é false', () => {
    mountModal(false);
    cy.get('h3').should('not.exist');
  });

  it('2. Deve permitir digitar texto e validar o limite de 280 caracteres', () => {
    mountModal(true);
    
    // Digita um texto e checa o contador
    cy.get('textarea').type('Testando o Mindly App');
    cy.contains('21/280').should('be.visible');

    // Testa o limite
    const longText = 'a'.repeat(281);
    cy.get('textarea').clear().type(longText, { delay: 0 });
    cy.contains('281/280').should('have.class', 'text-red-500');
    cy.get('button').contains('Post').should('be.disabled');
  });

  it('3. Deve mostrar preview da imagem ao selecionar arquivo', () => {
    mountModal(true);

    // Simula seleção de arquivo (importante: o input está hidden, mas o Cypress lida com isso)
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('imagem-falsa'),
      fileName: 'foto.png',
      lastModified: Date.now(),
    }, { force: true });

    cy.get('img[alt="Preview"]').should('be.visible');
    cy.contains('foto.png').should('be.visible');
  });

  it('4. Deve enviar o post e chamar os callbacks de sucesso', () => {
    mountModal(true);

    cy.get('textarea').type('Texto do post profissional');
    
    // Clica no botão Post
    cy.get('button').contains('Post').click();
    
    // Espera a chamada de API interceptada
    cy.wait('@createPostRequest');
    
    // Verifica se as funções de fechar e atualizar foram chamadas
    cy.get('@onCloseSpy').should('have.been.called');
    cy.get('@refreshPostsSpy').should('have.been.called');
  });

  it('5. Deve fechar o modal ao clicar no botão de fechar (X)', () => {
    mountModal(true);
    cy.get('button').contains('✕').click();
    cy.get('@onCloseSpy').should('have.been.called');
  });
});