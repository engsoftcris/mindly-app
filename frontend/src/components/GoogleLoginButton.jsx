import { useGoogleLogin } from '@react-oauth/google';
import { googleLoginApi } from '../api/auth';
import { useNavigate } from 'react-router-dom';

const GoogleLoginButton = () => {
  const navigate = useNavigate();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await googleLoginApi(tokenResponse.access_token);
        
        localStorage.setItem('access', response.data.access);
        localStorage.setItem('refresh', response.data.refresh);
        
        navigate('/'); 
        window.location.reload(); 
      } catch (error) {
        console.error('Erro no login Google:', error.response?.data || error.message);
        alert('Erro ao autenticar com Google no servidor.');
      }
    },
    onError: () => console.log('Falha no Google'),
  });

  return (
    <button 
      onClick={() => login()}
      type="button"
      // ADICIONADO: cursor-pointer e ajustes de cores para o seu tema dark
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
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
        alt="Google logo" 
      />
      Continuar com Google
    </button>
  );
};

export default GoogleLoginButton;