import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav
      data-cy="navbar"
      className="bg-black border-r border-gray-800 h-screen w-[80px] xl:w-64 flex flex-col p-4 sticky top-0"
    >

      {/* Logo */}
      <div data-cy="navbar-logo-container" className="mb-8 px-2">
        <Link
          data-cy="navbar-logo-link"
          to="/"
          className="text-2xl font-black text-blue-500 tracking-tight hover:text-blue-400 transition"
        >
          <span data-cy="navbar-logo-text">
            M<span className="hidden xl:inline">indly</span>
          </span>
        </Link>
      </div>


      {/* Links */}
      <div data-cy="navbar-links" className="flex flex-col gap-4 flex-1">

        {user ? (
          <>
            <Link
              data-cy="navbar-home-link"
              to="/"
              className="flex items-center gap-4 text-gray-300 hover:text-blue-400 transition font-bold text-lg p-3 hover:bg-gray-900 rounded-full"
            >
              <span data-cy="navbar-home-icon" className="text-2xl">🏠</span>
              <span data-cy="navbar-home-text" className="hidden xl:inline">Home</span>
            </Link>


            <Link
              data-cy="navbar-profile-link"
              to="/profile"
              className="flex items-center gap-4 text-gray-300 hover:text-blue-400 transition font-bold text-lg p-3 hover:bg-gray-900 rounded-full"
            >
              <span data-cy="navbar-profile-icon" className="text-2xl">👤</span>
              <span data-cy="navbar-profile-text" className="hidden xl:inline">Perfil</span>
            </Link>
          </>
        ) : (
          <Link
            data-cy="navbar-login-link"
            to="/login"
            className="text-blue-500 hover:text-blue-400 font-bold transition p-3 text-lg"
          >
            Entrar
          </Link>
        )}

      </div>


      {/* User section */}
      {user && (
        <div
          data-cy="navbar-user-section"
          className="mt-auto border-t border-gray-800 pt-4 flex flex-col gap-4"
        >

          <div data-cy="navbar-user-info" className="flex items-center gap-3 px-2">

            <img
              data-cy="navbar-user-avatar"
              src={user.profile_picture || "/static/images/default-avatar.png"}
              className="w-10 h-10 rounded-full object-cover border border-gray-700"
              alt="avatar"
            />

            <div data-cy="navbar-user-text" className="hidden xl:block overflow-hidden">

              <p data-cy="navbar-user-display-name" className="text-white text-sm font-bold truncate">
                {user.display_name
                  ? user.display_name.split(' ')[0]
                  : user.username}
              </p>

              <p data-cy="navbar-user-username" className="text-gray-500 text-xs truncate">
                @{user.username}
              </p>

            </div>

          </div>


          <button
            data-cy="navbar-logout-button"
            onClick={logout}
            type="button"
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
