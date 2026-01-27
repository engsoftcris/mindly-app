import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-md px-6 py-4 flex justify-between items-center">
      <Link to="/" className="text-xl font-bold text-blue-600">
        Mindly App
      </Link>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-gray-700">Olá, <strong>{user.full_name ? user.full_name.split(' ')[0] : user.username}</strong></span>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition"
            >
              Sair
            </button>
          </>
        ) : (
          <Link to="/login" className="text-blue-600 hover:underline">
            Entrar
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;