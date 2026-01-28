import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth(); // Pegamos o user que veio do log do Django

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-md">
      <div className="flex items-center space-x-4 mb-8">
        <img 
          src={user?.profile_picture} 
          alt="Profile" 
          className="w-20 h-20 rounded-full border-2 border-blue-500 object-cover"
        />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Olá, {user?.full_name || user?.username}!
          </h1>
          <p className="text-gray-500">Bem-vindo ao teu plano de vida.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-700">Status da Conta</h3>
          <p className="text-sm text-blue-600">
            {user?.is_private ? '🔒 Conta Privada' : '🌍 Conta Pública'}
          </p>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-700">Provedor de Login</h3>
          <p className="text-sm text-green-600 uppercase">{user?.provider}</p>
        </div>
      </div>

      <button 
        onClick={logout}
        className="mt-8 text-red-500 hover:text-red-700 font-medium text-sm transition"
      >
        Sair da conta
      </button>
    </div>
  );
};

export default Dashboard;