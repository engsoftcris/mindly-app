import React from 'react';
import MediaLightbox from './MediaLightbox';

describe('<MediaLightbox /> - Blindado', () => {
  const mockMedia = [
    {
      id: 1,
      media_url: 'https://placehold.co/600x400.png',
      moderation_status: 'APPROVED',
    },
    {
      id: 2,
      media_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      moderation_status: 'APPROVED',
    },
  ];

  it('1. deve renderizar a imagem e navegar para o vídeo via botão', () => {
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

    cy.getByData('lightbox-img').should('be.visible');
    cy.getByData('lightbox-counter').should('contain', '1 / 2');

    // Clica na seta DIREITA
    cy.getByData('lightbox-next').should('be.visible').click();
    cy.get('@onNext').should('have.been.called');
  });

  it('2. deve renderizar o vídeo corretamente', () => {
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

    cy.getByData('lightbox-video').should('be.visible');
    cy.getByData('lightbox-counter').should('contain', '2 / 2');
  });

  it('3. deve chamar onClose ao pressionar a tecla ESC', () => {
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

    cy.getByData('lightbox-container').focus().type('{esc}');
    cy.get('@onCloseSpy').should('have.been.calledOnce');
  });

  it('4. deve navegar para a próxima mídia usando a seta DIREITA', () => {
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

    cy.getByData('lightbox-container').focus().type('{rightarrow}');
    cy.get('@onNextSpy').should('have.been.calledOnce');
  });

  it('5. deve fechar ao clicar no botão de fechar (X)', () => {
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

    cy.getByData('lightbox-close').click();
    cy.get('@onClose').should('have.been.called');
  });

  it('6. deve fechar ao clicar no fundo (overlay)', () => {
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

    // Clica no overlay (ajustado para o seletor correto)
    cy.getByData('lightbox-overlay').click('topLeft', { force: true });
    cy.get('@onClose').should('have.been.called');
  });
});
