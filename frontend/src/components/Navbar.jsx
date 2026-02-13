import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-[#0F1419] border-b border-gray-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
      <Link to="/" className="text-xl font-black text-blue-500 tracking-tight hover:text-blue-400 transition">
        Mindly App
      </Link>

      <div className="flex items-center gap-6">
        {user ? (
          <>
            <Link 
              to="/profile" 
              className="text-gray-300 hover:text-blue-400 transition font-medium text-sm"
            >
              Perfil
            </Link>

            <span className="text-gray-700">|</span>

            <div className="flex items-center gap-3">
              <span className="text-gray-300 text-sm">
                Olá, <strong className="text-white">
                  {user.display_name ? user.display_name.split(' ')[0] : user.username}
                </strong>
              </span>
              
              <button
                onClick={logout}
                className="bg-transparent border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white px-4 py-1.5 rounded-full text-xs font-bold transition-all"
              >
                Sair
              </button>
            </div>
          </>
        ) : (
          <Link 
            to="/login" 
            className="text-blue-500 hover:text-blue-400 font-bold transition"
          >
            Entrar
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;