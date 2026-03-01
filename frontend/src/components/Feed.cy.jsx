import React from 'react';
import Feed from './Feed';
import AuthContext from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

describe('<Feed /> - Component Test', () => {
  const mockAuthValue = {
    user: { id: 'user-a-id', username: 'cristiano' },
    loading: false
  };

  // 1. Create dummy data to pass as props
  const mockPosts = [
    { 
      id: 1, 
      content: 'Post 1', 
      created_at: new Date().toISOString(),
      author: { id: 1, username: 'user1', display_name: 'User One' } 
    },
    { 
      id: 2, 
      content: 'Post 2', 
      created_at: new Date().toISOString(),
      author: { id: 2, username: 'user2', display_name: 'User Two' } 
    }
  ];

  const mountFeed = (posts = []) => {
    cy.mount(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter>
          <Feed 
            posts={posts} 
            currentUser={mockAuthValue.user} 
            setPosts={cy.stub().as('setPostsStub')} 
            // EM VEZ DE NULL, PASSE UM STUB OU FUNÇÃO VAZIA
            lastPostElementRef={cy.stub().as('lastPostRefStub')} 
          />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('1. Should render the list of posts correctly', () => {
    mountFeed(mockPosts);
    
    // Check if map worked and rendered items
    cy.contains('Post 1').should('be.visible');
    cy.contains('User One').should('be.visible');
    cy.contains('Post 2').should('be.visible');
  });

 it('2. Should show empty state if no posts are provided', () => {
  mountFeed([])

  // O Feed sempre renderiza o container raiz
  cy.get('div.flex.flex-col').should('exist')

  // Como não há posts, nenhum PostCard deve existir.
  // Se o PostCard tiver um data-cy (recomendado), use ele.
  // Exemplo ideal: cy.get('[data-cy="post-card"]').should('not.exist')

  // Sem data-cy, valide pela ausência do conteúdo conhecido
  cy.contains('Post 1').should('not.exist')
  cy.contains('Post 2').should('not.exist')
})

it('3. Should handle null authors without crashing', () => {
  const postWithNoAuthor = [
    { id: 99, content: 'Anonymous', created_at: new Date().toISOString(), author: null }
  ]

  mountFeed(postWithNoAuthor)

  cy.contains('Anonymous').should('be.visible')
})
});