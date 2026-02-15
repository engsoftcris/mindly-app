import React from 'react';
import Navbar from './Navbar';
import { BrowserRouter } from 'react-router-dom';
// IMPORTANTE: Aqui importamos sem as chavetas, porque é o export default
import AuthContext from '../context/AuthContext'; 

describe('<Navbar />', () => {
  
  const mountNavbar = (userValue) => {
    const logoutSpy = cy.spy().as('logoutSpy');
    
    cy.mount(
      <BrowserRouter>
        {/* Usamos o AuthContext que veio do teu export default */}
        <AuthContext.Provider value={{ 
          user: userValue, 
          logout: logoutSpy,
          loading: false 
        }}>
          <Navbar />
        </AuthContext.Provider>
      </BrowserRouter>
    );
  };

 it('Deve mostrar apenas o primeiro nome (Cristiano) quando logado', () => {
    mountNavbar({ 
      display_name: 'Cristiano Tobias', 
      username: 'cristiano40' 
    });

    // Removido o "Olá, " pois não existe mais no seu componente
    cy.get('p.text-white').should('contain', 'Cristiano');
    cy.contains('Tobias').should('not.exist');
    
    // Verifica se o @username também aparece embaixo
    cy.contains('@cristiano40').should('be.visible');
  });

  it('Deve mostrar o username quando o display_name está vazio', () => {
    mountNavbar({ 
      display_name: '', 
      username: 'tobias_dev' 
    });

    // O fallback agora é apenas o username direto
    cy.get('p.text-white').should('contain', 'tobias_dev');
  });

  it('Deve mostrar o link "Entrar" quando o user é null', () => {
    mountNavbar(null);

    cy.contains('Entrar').should('be.visible');
    
    // CORREÇÃO: Em vez de cy.get('button'), verificamos se o texto "Sair" não existe na página
    cy.contains('Sair').should('not.exist');
  });

  it('Deve disparar o logout ao clicar no botão Sair', () => {
    mountNavbar({ username: 'cristiano' });

    // Aqui o botão existe, então o cy.get funciona
    cy.get('button').contains(/Sair/i).click();
    
    cy.get('@logoutSpy').should('have.been.called');
  });

  it('Deve disparar o logout ao clicar no botão Sair', () => {
    mountNavbar({ username: 'cristiano' });

    cy.get('button').contains(/Sair/i).click();
    cy.get('@logoutSpy').should('have.been.called');
  });
});