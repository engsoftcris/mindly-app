import React from 'react'
import ReportButton from './ReportModal'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

describe('<ReportButton />', () => {
  const postId = 123

  beforeEach(() => {
    // Monta o componente com o ToastContainer para podermos ver os alertas
    cy.mount(
      <>
        <ToastContainer />
        <div className="p-10 bg-gray-900"> 
          <ReportButton postId={postId} onReportSuccess={cy.spy().as('onSuccess')} />
        </div>
      </>
    )
  })

  it('deve abrir o modal ao clicar no botão e mostrar as opções', () => {
    cy.contains('Denunciar').click()
    cy.get('h3').should('contain', 'Denunciar Post')
    cy.get('select').should('be.visible')
    cy.get('select').should('have.value', 'spam')
  })

  it('deve enviar denúncia com sucesso e fechar o modal', () => {
    // Intercepta a chamada da API
    cy.intercept('POST', '**/reports/', {
      statusCode: 201,
      body: { message: 'Created' }
    }).as('createReport')

    cy.contains('Denunciar').click()
    cy.get('select').select('hate_speech')
    cy.contains('Confirmar Denúncia').click()

    cy.wait('@createReport').its('request.body').should('deep.equal', {
      post: postId,
      reason: 'hate_speech'
    })

    // Valida UI
    cy.contains('Obrigado! Analisaremos a sua denúncia.').should('be.visible')
    cy.get('@onSuccess').should('have.been.calledWith', postId)
    cy.get('h3').should('not.exist') // Modal fechou
  })

  it('deve tratar erro 400 (duplicado) e ainda assim esconder o post', () => {
    // Intercepta simulando erro 400 (UniqueConstraint no Django)
    cy.intercept('POST', '**/reports/', {
      statusCode: 400,
      body: { detail: 'Already reported' }
    }).as('duplicateReport')

    cy.contains('Denunciar').click()
    cy.contains('Confirmar Denúncia').click()

    cy.wait('@duplicateReport')

    // Valida que o catch tratou para toast.info
    cy.contains('Já recebemos a sua denúncia sobre este post.').should('be.visible')
    cy.get('@onSuccess').should('have.been.calledWith', postId)
    cy.get('h3').should('not.exist')
  })

  it('deve fechar o modal ao clicar em Cancelar', () => {
    cy.contains('Denunciar').click()
    cy.contains('Cancelar').click()
    cy.get('h3').should('not.exist')
  })
})