import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; // Importa o componente que criaremos
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        {/* 1. Rota Pública: Se não estiver logado, vai para aqui */}
        <Route path="/login" element={<Login />} />
        
        {/* 2. Rota Privada: A "Home" do site agora é o Dashboard protegido */}
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />

        {/* 3. Podes adicionar outras rotas privadas aqui no futuro */}
        {/* <Route path="/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} /> */}
      </Routes>
    </div>
  );
}

export default App;