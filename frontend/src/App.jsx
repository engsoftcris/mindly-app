import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SettingsPage from "./components/SettingsPage.jsx"; 
import PublicProfile from "./components/PublicProfile"; 
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import NotificationsPage from "./components/Notifications.jsx"

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
        {/* Adicionado aqui também para o caso de erros no login */}
        <ToastContainer theme="dark" position="bottom-center" />
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
            <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
            <Route path="/profile/:id" element={<PrivateRoute><PublicProfile /></PrivateRoute>} />
            <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
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

      {/* LUGAR CORRETO DO TOAST CONTAINER: Dentro do return principal */}
      <ToastContainer 
          position="bottom-center" 
          autoClose={4000} 
          hideProgressBar={false}
          closeOnClick
          pauseOnHover
          theme="dark" 
      />
    </div>
  );
}

export default App;