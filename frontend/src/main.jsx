import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google'; // 1. Importação aqui
import './index.css';
import App from './App.jsx';

// Pegue o Client ID do seu Google Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
//const GOOGLE_CLIENT_ID = "871089850123-uf6ljhm2v6qh09rbi9rr5e3f7eq1vonk.apps.googleusercontent.com"
console.log("CLIENT ID CARREGADO:", GOOGLE_CLIENT_ID);
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}> {/* 2. Envolve aqui */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </StrictMode>
);