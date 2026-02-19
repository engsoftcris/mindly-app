// src/components/GifSelector.cy.jsx
import React from 'react'
import GifSelector from './GiftSelector'

describe('<GiftSelector />', () => {
  it('deve disparar setCanUseGifs(false) e fechar ao receber erro 429 (Cota Excedida)', () => {
    cy.intercept('GET', '**/v1/gifs/**', {
      statusCode: 429,
      body: { message: 'Over Quota' },
    }).as('giphyError')

    const onCloseSpy = cy.spy().as('onClose')
    const setCanUseGifsSpy = cy.spy().as('setCanUseGifs')

    cy.mount(
      <GifSelector
        onSelect={() => {}}
        onClose={onCloseSpy}
        setCanUseGifs={setCanUseGifsSpy}
      />
    )

    cy.wait('@giphyError')

    cy.get('@setCanUseGifs').should('have.been.calledOnceWithExactly', false)
    cy.get('@onClose').should('have.been.calledOnce')

    // opcional: garante que o seletor saiu/fechou (se o pai remove do DOM)
    // cy.get('[data-cy="gif-selector"]').should('not.exist')
  })

  it('deve selecionar um GIF e retornar a URL correta', () => {
    cy.intercept('GET', '**/v1/gifs/**', {
      statusCode: 200,
      body: {
        data: [
          {
            id: '1',
            title: 'Test GIF',
            images: {
              fixed_height: { url: 'https://media.giphy.com/test-gif.gif' },
              fixed_height_small: { url: 'https://media.giphy.com/test-gif-small.gif' },
            },
          },
        ],
      },
    }).as('getGifs')

    const onSelectSpy = cy.spy().as('onSelect')
    const onCloseSpy = cy.spy().as('onClose')
    const setCanUseGifsSpy = cy.spy().as('setCanUseGifs')

    cy.mount(
      <GifSelector
        onSelect={onSelectSpy}
        onClose={onCloseSpy}
        setCanUseGifs={setCanUseGifsSpy}
      />
    )

    cy.wait('@getGifs')

    // usa data-cy (mais estável que img[src=...])
    cy.get('[data-cy="gif-grid"]').should('exist')
    cy.get('[data-cy="gif-item"]').should('have.length.at.least', 1)

    cy.get('[data-cy="gif-item"]').first().click({ force: true })

    cy.get('@onSelect').should(
      'have.been.calledOnceWithExactly',
      'https://media.giphy.com/test-gif.gif'
    )
  })
})
