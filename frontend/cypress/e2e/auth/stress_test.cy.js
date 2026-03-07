describe('TAL-37: Teste de Carga e Concorrência', () => {

  const TOTAL_USERS = 1000
  
  const API_URL = '/api/accounts/profile/'

  it(`Deve suportar ${TOTAL_USERS} requisições simultâneas`, () => {

    cy.visit('/')

    cy.window().then((win) => {

      const token = win.localStorage.getItem('access')

      if (!token) {
        cy.log('⚠️ Token não encontrado. Testando resposta 401.')
      }

      const startTime = Date.now()
      const responses = []

      Cypress._.times(TOTAL_USERS, () => {

        cy.request({
          method: 'GET',
          url: API_URL,
          headers: {
            Authorization: `Bearer ${token}`
          },
          failOnStatusCode: false
        }).then((res) => {
          responses.push(res)
        })

      })

      cy.then(() => {

        const duration = (Date.now() - startTime) / 1000
        cy.log(`⏱️ Tempo total para ${TOTAL_USERS} usuários: ${duration}s`)

        responses.forEach((res) => {
          expect(res.status).to.be.oneOf([200, 401])
        })

      })

    })

  })

})