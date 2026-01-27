import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // Enquanto o AuthContext verifica o token no localStorage,
  // mostramos um loading para não redirecionar o user por engano.
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Se terminou de carregar e NÃO tem user, manda para o /login
  // O "replace" serve para o user não conseguir voltar atrás para a página bloqueada
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se está logado, deixa passar e renderiza o conteúdo (children)
  return children;
};

export default PrivateRoute;