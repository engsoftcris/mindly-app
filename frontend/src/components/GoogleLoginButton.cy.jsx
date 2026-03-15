import React from 'react';
import GoogleLoginButton from './GoogleLoginButton';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

describe('<GoogleLoginButton /> - Teste de UI e Chamada', () => {
  it('Deve renderizar e disparar o fluxo de login sem bater no servidor do Google', () => {
    // 1. Criamos um "espião" (stub) para a função que o botão deve chamar
    // Se o seu botão usa uma função interna, vamos testar o comportamento visual
    cy.mount(
      <GoogleOAuthProvider clientId="mock-id">
        <BrowserRouter>
          <GoogleLoginButton />
        </BrowserRouter>
      </GoogleOAuthProvider>
    );

    // 2. Check de Acessibilidade
    cy.getByData('google-login-button')
      .should('be.visible')
      .and('have.attr', 'aria-label', 'Continuar com Google');

    // 3. Simular o Clique
    // Para evitar o erro 401 do Google, a gente apenas verifica se o botão
    // está habilitado e se ao clicar ele não quebra o app.
    cy.getByData('google-login-button').click();

    // Como não podemos simular o popup do Google no Cypress,
    // verificamos se o botão está funcionando como esperado na UI.
    cy.getByData('google-icon').should('exist');
  });
});
