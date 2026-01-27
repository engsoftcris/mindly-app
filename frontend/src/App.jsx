import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute'; // 1. Importa o componente de proteção
import Register from './pages/Register';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Routes>
        {/* Rota Pública: qualquer um acede */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rota Privada: Só entra quem estiver logado */}
        <Route 
          path="/" 
          element={
            <PrivateRoute>
              <div className="p-10 text-center">
                <h1 className="text-3xl font-bold text-gray-800">Painel de Controle</h1>
                <p className="mt-2 text-gray-600">Bem-vindo ao teu plano de vida.</p>
              </div>
            </PrivateRoute>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;