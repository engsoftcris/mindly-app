import GoogleLoginButton from '../components/GoogleLoginButton';

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        
        {/* Cabeçalho */}
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Mindly
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            A tua jornada começa com um clique.
          </p>
        </div>

        {/* --- BOTÕES SOCIAIS --- */}
        <div className="mt-8 space-y-4">
          
          {/* O único que funciona por agora */}
          <GoogleLoginButton />
          
          <button 
            disabled 
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed transition duration-200"
          >
            <span className="mr-3 opacity-50">🔵</span> 
            Entrar com Facebook
          </button>

          <button 
            disabled 
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed transition duration-200"
          >
            <span className="mr-3 opacity-50">📱</span> 
            Entrar com Telefone
          </button>
        </div>

        {/* Rodapé Informativo */}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 leading-relaxed">
            Ao entrar, você concorda com os nossos <br />
            <span className="underline cursor-pointer">Termos de Serviço</span> e <span className="underline cursor-pointer">Privacidade</span>.
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;