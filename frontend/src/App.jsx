import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from './pages/Login';
import api from './api/axios';
import Dashboard from './pages/Dashboard';
import SettingsPage from './components/SettingsPage.jsx';
import PublicProfile from './components/PublicProfile';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import NotificationsPage from './components/Notifications.jsx';
import LoadingScreen from './components/LoadingScreen';
import SuggestedUsers from './components/SuggestedUsers';
import SearchBar from './components/SearchBar';
import useRelationshipStore from './store/useRelationshipStore';

function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (loading || !user) return;

    async function loadRelationships() {
      try {
        const response = await api.get(
          '/accounts/profiles/relationships-sync/'
        );
        useRelationshipStore.getState().setInitialData(response.data);
      } catch (err) {
        console.error('Erro ao sincronizar relationships:', err);
      }
    }

    loadRelationships();
  }, [user, loading]);

  if (loading) {
    return <LoadingScreen />;
  }

  const isAuthRoute = location.pathname === '/login';

  if (isAuthRoute) {
    if (user) return <Navigate to="/" replace />;
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <ToastContainer theme="dark" position="bottom-center" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex justify-center">
      <div className="w-full max-w-[1300px] flex min-h-screen">
        <header className="w-[80px] xl:w-64 flex-shrink-0">
          <Navbar />
        </header>

        <main className="w-[600px] border-x border-gray-800 bg-black min-h-screen flex-shrink-0 no-scrollbar overflow-y-auto">
          <Routes>
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <PrivateRoute>
                  <NotificationsPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile/:id"
              element={
                <PrivateRoute>
                  <PublicProfile />
                </PrivateRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <PrivateRoute>
                  <SettingsPage />
                </PrivateRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <aside className="hidden lg:block w-[350px] ml-4">
          <div className="sticky top-2 space-y-4 pt-2">
            <SearchBar />
            <SuggestedUsers />
            <div className="px-4 text-gray-500 text-xs">
              <p>© 2026 Mindly - Cristiano</p>
            </div>
          </div>
        </aside>
      </div>

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
