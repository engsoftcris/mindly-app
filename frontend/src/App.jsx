import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./components/ProfilePage"; // Suas configurações
import PublicProfile from "./components/PublicProfile"; // O Perfil que criamos agora! ✅
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  const { user } = useAuth();
  const location = useLocation();

  const isAuthRoute = location.pathname === "/login";

  if (isAuthRoute) {
    if (user) return <Navigate to="/" replace />;
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <div className="w-full max-w-[1024px] flex min-h-screen">
        <header className="w-[80px] xl:w-64 flex-shrink-0">
          <Navbar />
        </header>

        <main className="w-[600px] border-x border-gray-800 bg-black min-h-screen flex-shrink-0 no-scrollbar overflow-y-auto">
          <Routes>
  <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
  {/* A rota com ID deve vir antes para o Router testar o parâmetro primeiro */}
  <Route path="/profile/:id" element={<PrivateRoute><PublicProfile /></PrivateRoute>} />
  
  {/* A rota sem ID é a sua página de configurações */}
  <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
  
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
        </main>

        <aside className="hidden lg:block w-[350px] ml-4">
          <div className="sticky top-2">
            <div className="bg-[#16181C] rounded-2xl p-4 border border-gray-800 text-white">
              <h2 className="text-lg font-bold mb-4">O que está acontecendo</h2>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;