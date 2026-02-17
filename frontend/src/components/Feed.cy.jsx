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
          {/* 2. PASS THE PROPS HERE */}
          <Feed 
            posts={posts} 
            currentUser={mockAuthValue.user} 
            setPosts={cy.stub().as('setPostsStub')} 
            lastPostElementRef={null}
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
    // If you pass an empty array, .map() won't crash, it just won't render items
    mountFeed([]);
    cy.get('div.divide-y').should('be.empty');
  });

  it('3. Should handle null authors without crashing', () => {
    const postWithNoAuthor = [{ id: 99, content: 'Anonymous', author: null }];
    mountFeed(postWithNoAuthor);
    cy.contains('Anonymous').should('be.visible');
  });
});