import React from 'react';
import SuggestedUsers from './SuggestedUsers';
import { BrowserRouter } from 'react-router-dom';
import AuthContext from '../../src/context/AuthContext';
import useRelationshipStore from '../store/useRelationshipStore';

describe('<SuggestedUsers />', () => {
  const profileId = 'test-uuid-123';

  beforeEach(() => {
    localStorage.clear();
    useRelationshipStore.setState({ following: [] });

    cy.intercept('GET', '**/api/notifications/**', { body: [] });
  });

  const mountWithContext = (mockSuggestions = []) => {
    cy.intercept('GET', '**/accounts/suggested-follows/**', {
      statusCode: 200,
      body: { results: mockSuggestions },
    }).as('getSuggestions');

    cy.mount(
      <BrowserRouter>
        <AuthContext.Provider value={{ user: { id: profileId } }}>
          <SuggestedUsers />
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

  it('exibe lista de sugestões', () => {
    const mockUsers = [
      { id: 10, username: 'cristiano', display_name: 'Cristiano Tobias' },
      { id: 11, username: 'juliet', display_name: 'Juliet B' },
    ];

    mountWithContext(mockUsers);

    cy.wait('@getSuggestions');

    cy.get('[data-cy="suggested-item"]').should('have.length', 2);
    cy.contains('Cristiano Tobias').should('exist');
  });

  it('remove usuário ao seguir', () => {
    const mockUsers = [
      { id: 10, username: 'cristiano', display_name: 'Cristiano' },
    ];

    let callCount = 0;

    cy.intercept('GET', '**/accounts/suggested-follows/**', (req) => {
      callCount++;

      if (callCount === 1) {
        req.reply({ statusCode: 200, body: { results: mockUsers } });
      } else {
        req.reply({ statusCode: 200, body: { results: [] } });
      }
    }).as('getSuggestions');

    cy.intercept('POST', '**/accounts/profiles/10/follow/', {
      statusCode: 200,
    }).as('followRequest');

    // 🚨 monta SEM intercept interno
    cy.mount(
      <BrowserRouter>
        <AuthContext.Provider value={{ user: { id: 'test-uuid-123' } }}>
          <SuggestedUsers />
        </AuthContext.Provider>
      </BrowserRouter>
    );

    cy.wait('@getSuggestions');

    cy.get('[data-cy="follow-button"]').click();
    cy.wait('@followRequest');

    cy.get('[data-cy="suggested-item"]').should('not.exist');
  });
});
