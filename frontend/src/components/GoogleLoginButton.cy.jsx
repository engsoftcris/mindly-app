import React from 'react';
import GoogleLoginButton from './GoogleLoginButton';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

describe('<GoogleLoginButton />', () => {
  
  beforeEach(() => {
    localStorage.clear();
  });

  const mountButton = () => {
    cy.mount(
      <GoogleOAuthProvider clientId="12345-mock-id.apps.googleusercontent.com">
        <BrowserRouter>
          <GoogleLoginButton />
        </BrowserRouter>
      </GoogleOAuthProvider>
    );
  };

  it('1. Deve renderizar o botão com o texto e ícone corretos', () => {
    mountButton();
    
    // Verifica se o botão existe e tem o estilo esperado
    cy.get('button')
      .should('be.visible')
      .and('contain', 'Google');
    
    // Verifica se a imagem do logo do Google está presente
    cy.get('img')
      .should('have.attr', 'src')
      .and('include', 'google.svg');
  });

  it('2. Deve ter o estado inicial correto', () => {
    mountButton();
    
    // Garante que o botão não começa desativado
    cy.get('button').should('not.be.disabled');
  });
});