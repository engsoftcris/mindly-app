import { useGoogleLogin } from '@react-oauth/google';
import api from '../api/axios'; // Importando sua instância do axios
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

// Adicionamos a prop 'isRegister' (por padrão ela é falsa, ou seja, age como Login)
const GoogleLoginButton = ({ isRegister = false }) => {
  const navigate = useNavigate();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Escolhe a rota certa baseada na tela onde o botão está
        const endpoint = isRegister
          ? '/accounts/google-register/'
          : '/accounts/google-login/';

        const response = await api.post(endpoint, {
          access_token: tokenResponse.access_token,
        });

        // Salva os tokens recebidos do Django
        localStorage.setItem('access', response.data.access);
        localStorage.setItem('refresh', response.data.refresh);

        toast.success(
          isRegister
            ? 'Conta criada e login realizado com sucesso! 🎉'
            : 'Login realizado com sucesso! 👋'
        );

        navigate('/');
        window.location.reload();
      } catch (error) {
        console.error(error);

        // Pega a mensagem de erro amigável que injetamos no Django (.message ou .error)
        const errorMsg =
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Erro ao autenticar no servidor.';

        toast.error(`Erro: ${errorMsg}`);
      }
    },
    onError: (_error) => {
      toast.error('Falha na comunicação com o Google.');
    },
  });

  return (
    <button
      onClick={() => login()}
      type="button"
      aria-label={isRegister ? 'Cadastrar com Google' : 'Continuar com Google'}
      data-cy={isRegister ? 'google-register-button' : 'google-login-button'}
      className="
        w-full flex justify-center items-center 
        gap-3 py-3 px-4 
        bg-white hover:bg-gray-100
        text-black font-bold text-sm
        rounded-xl shadow-sm 
        transition-all duration-200
        cursor-pointer
      "
    >
      <img
        className="h-5 w-5"
        data-cy="google-icon"
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google logo"
      />
      {isRegister ? 'Cadastrar com Google' : 'Continuar com Google'}
    </button>
  );
};

export default GoogleLoginButton;
