import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import { AuthProvider } from '../context/AuthContext';

describe('<PrivateRoute /> - Teste de Proteção de Rotas', () => {

  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Deve redirecionar para /login se não houver usuário logado', () => {
    // Usamos MemoryRouter para rastrear a navegação interna do React Router
    cy.mount(
      <MemoryRouter initialEntries={['/private']}>
        <AuthProvider>
          <Routes>
            <Route path="/private" element={
              <PrivateRoute>
                <div id="protegido">Conteúdo Protegido</div>
              </PrivateRoute>
            } />
            <Route path="/login" element={<div id="login-page">Página de Login</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // 1. O conteúdo protegido NÃO pode existir
    cy.get('#protegido').should('not.exist');

    // 2. A página de login DEVE aparecer (aumentamos o timeout para o redirecionamento)
    cy.contains('Página de Login', { timeout: 10000 }).should('be.visible');
  });

  it('2. Deve renderizar o conteúdo se o usuário estiver logado', () => {
    localStorage.setItem('access', 'token-valido');
    
    // Intercepta qualquer chamada de profile que o AuthContext faça ao iniciar
    cy.intercept('GET', '**/accounts/profile/**', {
      statusCode: 200,
      body: { id: 1, username: 'cristiano' }
    }).as('getProfile');

    cy.mount(
      <MemoryRouter initialEntries={['/private']}>
        <AuthProvider>
          <Routes>
            <Route path="/private" element={
              <PrivateRoute>
                <div id="protegido">Conteúdo Protegido</div>
              </PrivateRoute>
            } />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Espera a autenticação terminar
    cy.wait('@getProfile');

    // O conteúdo DEVE estar visível
    cy.get('#protegido', { timeout: 10000 }).should('be.visible');
  });
});