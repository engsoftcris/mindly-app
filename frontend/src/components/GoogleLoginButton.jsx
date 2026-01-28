import { useGoogleLogin } from '@react-oauth/google';
import { googleLoginApi } from '../api/auth';
import { useNavigate } from 'react-router-dom';

const GoogleLoginButton = () => {
  const navigate = useNavigate();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const response = await googleLoginApi(tokenResponse.access_token);
        
        // Salva os tokens exatamente como o seu sistema espera (conforme o api.js)
        localStorage.setItem('access', response.data.access);
        localStorage.setItem('refresh', response.data.refresh);
        
        // Redireciona para a página principal
        navigate('/'); 
        window.location.reload(); // Recarrega para o AuthContext ler os novos tokens
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
      className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      <img className="h-5 w-5 mr-2" src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google logo" />
      Google
    </button>
  );
};

export default GoogleLoginButton;