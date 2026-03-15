import React from 'react';
import Feed from './Feed';
import AuthContext from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

describe('<Feed /> - Blindado', () => {
  const mockAuthValue = {
    user: { id: 'user-a-id', username: 'cristiano' },
    loading: false,
  };

  const mockPosts = [
    {
      id: 1,
      content: 'Post 1',
      created_at: new Date().toISOString(),
      author: { id: 1, username: 'user1', display_name: 'User One' },
    },
    {
      id: 2,
      content: 'Post 2',
      created_at: new Date().toISOString(),
      author: { id: 2, username: 'user2', display_name: 'User Two' },
    },
  ];

  const mountFeed = (posts = []) => {
    cy.mount(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter>
          <div className="bg-black min-h-screen">
            <Feed
              posts={posts}
              currentUser={mockAuthValue.user}
              setPosts={cy.stub().as('setPostsStub')}
              lastPostElementRef={cy.stub().as('lastPostRefStub')}
            />
          </div>
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('1. Deve renderizar a lista de posts corretamente', () => {
    mountFeed(mockPosts);

    // Valida o container principal
    cy.getByData('feed-container').should('be.visible');

    // Valida que existem exatamente 2 PostCards
    cy.getByData('post-card').should('have.length', 2);

    cy.contains('Post 1').should('be.visible');
    cy.contains('Post 2').should('be.visible');
  });

  it('2. Deve mostrar estado vazio se não houver posts', () => {
    mountFeed([]);

    cy.getByData('feed-container').should('exist');

    // Garante que nenhum PostCard foi renderizado
    cy.getByData('post-card').should('not.exist');
  });

  it('3. Deve lidar com autores nulos sem crashar', () => {
    const postWithNoAuthor = [
      {
        id: 99,
        content: 'Anonymous',
        created_at: new Date().toISOString(),
        author: null,
      },
    ];

    mountFeed(postWithNoAuthor);

    cy.getByData('post-card').should('have.length', 1);
    cy.contains('Anonymous').should('be.visible');
  });
});
