describe('Dashboard Feed & Infinite Scroll E2E', () => {
  beforeEach(() => {
    cy.clearLocalStorage();

    // 1. Define INTERCEPTS FIRST
    cy.intercept('GET', '**/accounts/profile*', {
      statusCode: 200,
      body: { 
        username: 'cristiano', 
        full_name: 'Cristiano Tobias' 
      }
    }).as('getProfile');

    cy.intercept('GET', '**/accounts/feed/**', (req) => {
        // This dynamic intercept handles both page 1 and page 2
        if (req.url.includes('page=2')) {
            req.reply({
                statusCode: 200,
                body: {
                    count: 2,
                    next: null,
                    results: [{ 
                        id: 2, 
                        content: 'Loaded via Infinite Scroll!', 
                        author: { username: 'system' }, 
                        created_at: new Date().toISOString() 
                    }]
                }
            });
        } else {
            req.reply({
                statusCode: 200,
                body: {
                    count: 2,
                    next: 'http://localhost:8000/api/accounts/feed/?page=2',
                    results: [{ 
                        id: 1, 
                        content: 'Hello from Page 1!', 
                        author: { username: 'cristiano' }, 
                        created_at: new Date().toISOString() 
                    }]
                }
            });
        }
    }).as('getFeed');

    // 2. Set the token
    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token-123');
    });

    // 3. Visit and Wait for initial data
    cy.visit('/');
    cy.wait('@getProfile', { timeout: 10000 });
    cy.wait('@getFeed', { timeout: 10000 });
  });

  it('should display initial posts and load more content when scrolling', () => {
    // Check first post
    cy.contains('Hello from Page 1!').should('be.visible');

    // Scroll to bottom
    cy.scrollTo('bottom');

    // Wait for the second call (Infinite scroll)
    cy.wait('@getFeed');
    cy.contains('Loaded via Infinite Scroll!').should('be.visible');
  });
});