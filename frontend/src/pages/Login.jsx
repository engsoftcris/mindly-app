import GoogleLoginButton from '../components/GoogleLoginButton';

const Login = () => {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      {/* Caixa com glow azul Mindly */}
      <div
        data-cy="login-card"
        className="
          w-full max-w-[420px]
          bg-[#16181C]
          border border-gray-700
          rounded-2xl
          p-10
          shadow-2xl
          shadow-black/60
          hover:shadow-[0_0_40px_rgba(29,155,240,0.15)]
          transition-shadow duration-500
        "
      >
        {/* Header */}
        <div className="text-center">
          <h2
            data-cy="login-title"
            className="text-3xl font-extrabold text-white tracking-tight"
          >
            Mindly
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            A tua jornada começa com um clique.
          </p>
        </div>

        {/* Botões */}
        <div className="mt-8 space-y-4">
          {/* O GoogleLoginButton deve ter o data-cy="google-login-button" internamente */}
          <div data-cy="google-login-wrapper">
            <GoogleLoginButton />
          </div>

          <button
            disabled
            data-cy="facebook-login-disabled"
            className="
              w-full flex items-center justify-center gap-3
              px-4 py-3
              rounded-xl
              border border-gray-700
              bg-black/40
              text-sm font-semibold text-gray-500
              cursor-not-allowed
            "
          >
            🔵 Entrar com Facebook
          </button>

          <button
            disabled
            data-cy="phone-login-disabled"
            className="
              w-full flex items-center justify-center gap-3
              px-4 py-3
              rounded-xl
              border border-gray-700
              bg-black/40
              text-sm font-semibold text-gray-500
              cursor-not-allowed
            "
          >
            📱 Entrar com Telefone
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-700 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            Ao entrar, você concorda com os nossos <br />
            <span className="underline hover:text-gray-400 cursor-pointer">
              Termos de Serviço
            </span>{' '}
            e{' '}
            <span className="underline hover:text-gray-400 cursor-pointer">
              Privacidade
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
