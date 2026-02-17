describe('Fluxo de Likes (TAL-39)', () => {
  beforeEach(() => {
    cy.login();
  });

  it('Deve realizar o ciclo completo de like e unlike com sucesso', () => {
  cy.intercept('POST', '**/api/posts/*/like/', {
    statusCode: 200,
    body: { liked: true, likes_count: 11 }
  }).as('likeRequest');

  cy.get('button.flex.items-center.gap-2').first().as('btnLike');
  cy.get('@btnLike').click();

  cy.wait('@likeRequest');
  cy.get('@btnLike').should('contain', '11');

  cy.intercept('POST', '**/api/posts/*/like/', {
    statusCode: 200,
    body: { liked: false, likes_count: 10 }
  }).as('unlikeRequest');

  cy.get('@btnLike').click();
  cy.wait('@unlikeRequest');
  cy.get('@btnLike').should('contain', '10');
});

});