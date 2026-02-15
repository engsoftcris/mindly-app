import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    // Mudamos de "sticky top-0 w-full" para "fixed h-screen w-64"
    <nav className="bg-black border-r border-gray-800 h-screen w-[80px] xl:w-64 flex flex-col p-4 sticky top-0">
      
      {/* Logo (Agora no topo da barra lateral) */}
      <div className="mb-8 px-2">
        <Link to="/" className="text-2xl font-black text-blue-500 tracking-tight hover:text-blue-400 transition">
          M
          <span className="hidden xl:inline">indly</span>
        </Link>
      </div>

      {/* Links de Navegação (Verticalizados) */}
      <div className="flex flex-col gap-4 flex-1">
        {user ? (
          <>
            <Link 
              to="/" 
              className="flex items-center gap-4 text-gray-300 hover:text-blue-400 transition font-bold text-lg p-3 hover:bg-gray-900 rounded-full"
            >
              <span className="text-2xl">🏠</span>
              <span className="hidden xl:inline">Home</span>
            </Link>

            <Link 
              to="/profile" 
              className="flex items-center gap-4 text-gray-300 hover:text-blue-400 transition font-bold text-lg p-3 hover:bg-gray-900 rounded-full"
            >
              <span className="text-2xl">👤</span>
              <span className="hidden xl:inline">Perfil</span>
            </Link>
          </>
        ) : (
          <Link 
            to="/login" 
            className="text-blue-500 hover:text-blue-400 font-bold transition p-3 text-lg"
          >
            Entrar
          </Link>
        )}
      </div>

      {/* Seção de Utilizador e Logout (Fundo da Sidebar) */}
      {user && (
        <div className="mt-auto border-t border-gray-800 pt-4 flex flex-col gap-4">
          <div className="flex items-center gap-3 px-2">
            <img 
              src={user.profile_picture || "/static/images/default-avatar.png"} 
              className="w-10 h-10 rounded-full object-cover border border-gray-700" 
              alt="avatar"
            />
            <div className="hidden xl:block overflow-hidden">
              <p className="text-white text-sm font-bold truncate">
                {user.display_name ? user.display_name.split(' ')[0] : user.username}
              </p>
              <p className="text-gray-500 text-xs truncate">@{user.username}</p>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full bg-transparent border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white py-2 rounded-full text-xs font-bold transition-all"
          >
            Sair
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;