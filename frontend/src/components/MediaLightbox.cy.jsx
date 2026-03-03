import React from 'react'
import MediaLightbox from './MediaLightbox'

describe('<MediaLightbox />', () => {
  const mockMedia = [
    { id: 1, media_url: 'https://placehold.co/600x400.png', moderation_status: 'APPROVED' },
    { id: 2, media_url: 'https://www.w3schools.com/html/mov_bbb.mp4', moderation_status: 'APPROVED' }
  ];

  it('deve renderizar a imagem e navegar para o vídeo via botão', () => {
    const onNextSpy = cy.spy().as('onNext');

    cy.mount(
      <div className="h-screen w-screen bg-black">
        <MediaLightbox 
          isOpen={true}
          mediaList={mockMedia}
          currentIndex={0}
          onClose={() => {}}
          onNext={onNextSpy}
          onPrev={() => {}}
        />
      </div>
    );

    // Verifica imagem inicial
    cy.get('img').should('be.visible');
    cy.contains('1 / 2').should('be.visible');

    // Selecionamos especificamente a SETA DIREITA
    // Ela é o botão que está na direita (absolute right-4)
    cy.get('button.right-4').should('be.visible').click();
    
    cy.get('@onNext').should('have.been.called');
  });

  it('deve renderizar o vídeo corretamente', () => {
    cy.mount(
      <MediaLightbox 
        isOpen={true}
        mediaList={mockMedia}
        currentIndex={1}
        onClose={() => {}}
        onNext={() => {}}
        onPrev={() => {}}
      />
    );

    cy.get('video').should('be.visible');
    cy.contains('2 / 2').should('be.visible');
  });

  it('deve chamar onClose ao pressionar a tecla ESC', () => {
    const onCloseSpy = cy.spy().as('onCloseSpy');
    
    cy.mount(
      <MediaLightbox 
        isOpen={true}
        mediaList={mockMedia}
        currentIndex={0}
        onClose={onCloseSpy}
        onNext={() => {}}
        onPrev={() => {}}
      />
    );

    // 1. Garantimos que o container existe e recebe foco
    // 2. Simulamos o pressionar da tecla Escape diretamente nele
    cy.get('#lightbox-container')
      .focus()
      .type('{esc}');
    
    cy.get('@onCloseSpy').should('have.been.calledOnce');
  });

  // Teste bônus: já que adicionamos navegação por teclado, vamos testar!
  it('deve navegar para a próxima mídia usando a seta DIREITA', () => {
    const onNextSpy = cy.spy().as('onNextSpy');
    
    cy.mount(
      <MediaLightbox 
        isOpen={true}
        mediaList={mockMedia}
        currentIndex={0}
        onClose={() => {}}
        onNext={onNextSpy}
        onPrev={() => {}}
      />
    );

    cy.get('#lightbox-container').focus().type('{rightarrow}');
    cy.get('@onNextSpy').should('have.been.calledOnce');
  });

  it('deve fechar ao clicar no botão de fechar (X)', () => {
    const onCloseSpy = cy.spy().as('onClose');

    cy.mount(
      <MediaLightbox 
        isOpen={true}
        mediaList={mockMedia}
        currentIndex={0}
        onClose={onCloseSpy}
        onNext={() => {}}
        onPrev={() => {}}
      />
    );

    // O botão de fechar é o que tem a classe top-6 right-6
    cy.get('button.top-6.right-6').click();
    cy.get('@onClose').should('have.been.called');
  });

  it('deve fechar ao clicar no fundo (overlay)', () => {
    const onCloseSpy = cy.spy().as('onClose');

    cy.mount(
      <MediaLightbox 
        isOpen={true}
        mediaList={mockMedia}
        currentIndex={0}
        onClose={onCloseSpy}
        onNext={() => {}}
        onPrev={() => {}}
      />
    );

    // Clicamos no container pai (que tem o onClick={onClose})
    // Mas evitamos clicar na imagem (stopPropagation)
    cy.get('.relative.w-full.h-full').click('topLeft'); 
    cy.get('@onClose').should('have.been.called');
  });
});