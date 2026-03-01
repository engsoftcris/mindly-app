import './commands'


beforeEach(() => {
  cy.intercept('GET', '**/api/notifications/**', { statusCode: 200, body: [] })
})