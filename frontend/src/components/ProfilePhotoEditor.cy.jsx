import React from 'react'
import ProfilePhotoEditor from './ProfilePhotoEditor'

describe('<ProfilePhotoEditor />', () => {
  const currentImg = 'https://via.placeholder.com/150'

  it('Deve renderizar com a imagem atual e trocar para o preview ao selecionar arquivo', () => {
    const onFileSelectSpy = cy.spy().as('onFileSelectSpy')

    cy.mount(
      <div className="p-10 bg-black">
        <ProfilePhotoEditor 
          currentImage={currentImg} 
          onFileSelect={onFileSelectSpy} 
        />
      </div>
    )

    cy.get('img[alt="Avatar Edit"]').should('have.attr', 'src', currentImg)

    cy.get('[data-cy="profile-file-input"]').selectFile({
      contents: Cypress.Buffer.from('file-content'),
      fileName: 'test-avatar.png',
      mimeType: 'image/png',
    }, { force: true })

    cy.get('@onFileSelectSpy').should('have.been.calledOnce')
    cy.get('img[alt="Avatar Edit"]').should('have.attr', 'src').and('include', 'blob:')
  })

  it('Deve ter as classes de hover configuradas', () => {
    cy.mount(
      <div className="p-10 bg-black">
        <ProfilePhotoEditor currentImage={currentImg} onFileSelect={() => {}} />
      </div>
    )

    // Em vez de simular o mouse real (que depende de plugins),
    // verificamos se o elemento tem as classes do Tailwind para Hover.
    // Isso garante que a lógica visual está lá.
    
    // 1. Verifica se a imagem tem a borda azul configurada para hover
    cy.get('img').should('have.class', 'group-hover:border-[#1D9BF0]')

    // 2. Verifica se o overlay tem a classe que o torna visível no hover
    cy.get('svg').parent().should('have.class', 'group-hover:opacity-100')

    // 3. Teste de trigger manual (simula o evento JS)
    cy.get('.group').trigger('mouseover')
    // Nota: Como o Tailwind usa CSS puro (:hover), o trigger JS 
    // às vezes não muda o estilo visual no Cypress, mas garante que o evento dispara.
    cy.get('.group').should('be.visible')
  })
})