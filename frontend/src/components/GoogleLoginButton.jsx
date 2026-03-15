import { useGoogleLogin } from '@react-oauth/google';
import { googleLoginApi } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const GoogleLoginButton = () => {
  const navigate = useNavigate();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await googleLoginApi(tokenResponse.access_token);

        localStorage.setItem('access', response.data.access);
        localStorage.setItem('refresh', response.data.refresh);

        toast.success('Login realizado com sucesso!');

        navigate('/');
        window.location.reload();
      } catch (error) {
        const errorMsg =
          error.response?.data?.detail || 'Erro ao autenticar no servidor.';
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
      aria-label="Continuar com Google"
      // ADICIONADO: data-cy para o botão principal
      data-cy="google-login-button"
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
        // ADICIONADO: data-cy para o ícone
        data-cy="google-icon"
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google logo"
      />
      Continuar com Google
    </button>
  );
};

export default GoogleLoginButton;
