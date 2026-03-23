import React from 'react';
import GoogleLoginButton from './GoogleLoginButton';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

describe('<GoogleLoginButton /> - Teste de UI', () => {
  it('Deve renderizar e simular o clique sem abrir o popup do Google', () => {
    cy.mount(
      <GoogleOAuthProvider clientId="mock-id">
        <BrowserRouter>
          <GoogleLoginButton />
        </BrowserRouter>
      </GoogleOAuthProvider>
    );

    // 1. Verificamos se o botão está lá
    cy.get('[data-cy="google-login-button"]').should('be.visible');

    // 2. AQUI ESTÁ A MÁGICA:
    // Forçamos o botão a não fazer nada quando clicado,
    // apenas para o Cypress registrar que o clique aconteceu sem abrir o popup.
    cy.get('[data-cy="google-login-button"]').then(($btn) => {
      $btn.on('click', (e) => e.preventDefault());
    });

    // 3. Agora clicamos e nada vai abrir
    cy.get('[data-cy="google-login-button"]').click();

    // 4. Verificamos se o ícone ainda existe (UI intacta)
    cy.get('[data-cy="google-icon"]').should('exist');
  });
});
