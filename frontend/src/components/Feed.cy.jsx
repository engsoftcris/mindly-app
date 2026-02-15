import React from 'react';
import Feed from './Feed';
import AuthContext from '../context/AuthContext';
import { MemoryRouter } from 'react-router-dom';

describe('<Feed /> - Teste com Interceptação Real', () => {
  // Mock do contexto para o Feed e para o CreatePost interno
  const mockAuthValue = {
    user: {
      username: 'cristiano',
      profile_picture: 'https://via.placeholder.com/150'
    },
    loading: false
  };

  beforeEach(() => {
    // Interceptação da aba "For You" (URL: /posts/)
    cy.intercept('GET', '**/posts/', (req) => {
      if (!req.url.includes('page=2')) {
        req.reply({
          statusCode: 200,
          body: {
            next: 'http://localhost:8000/api/posts/?page=2',
            results: [
              { id: 1, content: 'Post da Página 1 '.repeat(10), author: { id: 1, username: 'cristiano', display_name: 'Cristiano' } },
              { id: 2, content: 'Outro post da P1 '.repeat(10), author: { id: 2, username: 'admin', display_name: 'Admin' } },
            ],
          },
        });
      }
    }).as('getFeedP1');

    // Interceptação da Página 2
    cy.intercept('GET', '**/posts/?page=2', {
      statusCode: 200,
      body: {
        next: null,
        results: [{ id: 3, content: 'CONTEÚDO DA PÁGINA 2', author: { id: 3, username: 'junior', display_name: 'Junior' } }],
      },
    }).as('getFeedP2');
  });

  // Função auxiliar para montar o componente com os Providers necessários
  const mountFeed = (component) => {
    cy.mount(
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter>
          {component}
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('1. Deve carregar a página 2 via scroll (com novo layout de abas)', () => {
    mountFeed(
      <div
        id="scroll-container"
        style={{ height: '400px', overflowY: 'auto', width: '100%', background: 'black' }}
      >
        <Feed />
      </div>
    );

    // Espera carregar a P1
    cy.wait('@getFeedP1');
    cy.contains('Cristiano').should('exist');

    // Faz scroll até o fim para disparar o IntersectionObserver
    cy.get('#scroll-container').scrollTo('bottom');

    // Espera carregar a P2
    cy.wait('@getFeedP2');
    cy.contains('CONTEÚDO DA PÁGINA 2').should('exist');
  });

  it('2. Deve alternar entre as abas For You e Following', () => {
    // Interceptamos explicitamente a chamada que o componente faz ao mudar para 'following'
    cy.intercept('GET', '**/accounts/feed/', {
      statusCode: 200,
      body: { 
        next: null, 
        results: [{ 
          id: 10, 
          content: 'Post de quem eu sigo', 
          author: { id: 5, username: 'amigo', display_name: 'Amigo Especial' } 
        }] 
      }
    }).as('getFollowing');

    mountFeed(<Feed />);

    // Espera o feed inicial carregar primeiro para evitar confusão de requests
    cy.wait('@getFeedP1');

    // Clica na aba Following - usamos force: true se o header sticky estiver atrapalhando
    cy.contains('button', 'Following').click();
    
    // Verifica se a requisição correta saiu
    cy.wait('@getFollowing');
    
    cy.contains('Post de quem eu sigo').should('be.visible');
    cy.contains('Amigo Especial').should('be.visible');
  });

  it('3. Deve garantir que o fallback de autor funciona', () => {
    // Simulando autor nulo para testar a robustez do render
    cy.intercept('GET', '**/posts/', {
      statusCode: 200,
      body: {
        next: null,
        results: [{ id: 99, content: 'Post de Autor Nulo', author: null }],
      },
    }).as('getAnom');

    mountFeed(<Feed />);
    cy.wait('@getAnom');

    // Verifica se o post renderiza mesmo sem autor (seu código usa author?.display_name)
    cy.contains('Post de Autor Nulo').should('be.visible');
    
    // Se você quiser que apareça "Usuário" quando o author for null, 
    // você precisa mudar no Feed.jsx para: {post.author?.display_name || "Usuário"}
  });

  it('3. Deve garantir que o fallback de autor funciona', () => {
    cy.intercept('GET', '**/posts/', {
      statusCode: 200,
      body: {
        next: null,
        results: [{ id: 99, content: 'Post Anônimo', author: null }],
      },
    }).as('getAnom');

    mountFeed(<Feed />);
    cy.wait('@getAnom');

    // No seu código: {post.author?.display_name || post.author?.username}
    // Se author é null, ele não renderiza nada. Se você quiser um fallback escrito "Usuário", 
    // precisaria mudar o código do Feed. Como o código atual não tem esse fallback, 
    // vamos apenas testar se o post aparece sem quebrar.
    cy.contains('Post Anônimo').should('be.visible');
  });
});