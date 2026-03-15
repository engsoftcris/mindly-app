import React from 'react';
import GifSelector from './GiftSelector';

describe('<GiftSelector /> - Blindado', () => {
  beforeEach(() => {
    // Interceptador genérico para evitar chamadas reais à Giphy durante o mount
    cy.intercept('GET', '**/v1/gifs/**', {
      statusCode: 200,
      body: { data: [] },
    }).as('giphyPing');
  });

  it('deve disparar setCanUseGifs(false) e fechar ao receber erro 429', () => {
    cy.intercept('GET', '**/v1/gifs/**', {
      statusCode: 429,
      body: { message: 'Over Quota' },
    }).as('giphyError');

    const onCloseSpy = cy.spy().as('onClose');
    const setCanUseGifsSpy = cy.spy().as('setCanUseGifs');

    cy.mount(
      <GifSelector
        onSelect={() => {}}
        onClose={onCloseSpy}
        setCanUseGifs={setCanUseGifsSpy}
      />
    );

    cy.wait('@giphyError');

    cy.get('@setCanUseGifs').should('have.been.calledWith', false);
    cy.get('@onClose').should('have.been.calledOnce');
  });

  it('deve selecionar um GIF e retornar a URL correta', () => {
    const gifUrl = 'https://media.giphy.com/test-gif.gif';

    cy.intercept('GET', '**/v1/gifs/**', {
      statusCode: 200,
      body: {
        data: [
          {
            id: '1',
            title: 'Test GIF',
            images: {
              fixed_height: { url: gifUrl },
              fixed_height_small: { url: 'https://media.giphy.com/small.gif' },
            },
          },
        ],
      },
    }).as('getGifs');

    const onSelectSpy = cy.spy().as('onSelect');

    cy.mount(
      <GifSelector
        onSelect={onSelectSpy}
        onClose={() => {}}
        setCanUseGifs={() => {}}
      />
    );

    cy.wait('@getGifs');

    cy.getByData('gif-grid').should('be.visible');

    // O clique com force: true resolve o problema do centro do elemento estar "escondido"
    cy.getByData('gif-item').first().click({ force: true });

    cy.get('@onSelect').should('have.been.calledWith', gifUrl);
  });
});
