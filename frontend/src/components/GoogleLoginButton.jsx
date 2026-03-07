import { useGoogleLogin } from '@react-oauth/google';
import { googleLoginApi } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify'; // Import correto para disparar o toast

const GoogleLoginButton = () => {
  const navigate = useNavigate();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log('1. Sucesso Google: Token recebido', tokenResponse.access_token);
      
      try {
        console.log('2. Enviando para o backend...');
        const response = await googleLoginApi(tokenResponse.access_token);
        
        console.log('3. Resposta do backend:', response.data);
        
        localStorage.setItem('access', response.data.access);
        localStorage.setItem('refresh', response.data.refresh);
        
        toast.success('Login realizado com sucesso!');
        
        navigate('/'); 
        window.location.reload(); 
      } catch (error) {
        // LOG DETALHADO PARA DEBUG
        console.error('❌ ERRO NO BACKEND:');
        console.error('Status:', error.response?.status);
        console.error('Data:', error.response?.data);
        console.error('Mensagem:', error.message);

        const errorMsg = error.response?.data?.detail || 'Erro ao autenticar no servidor.';
        toast.error(`Erro: ${errorMsg}`);
      }
    },
    onError: (error) => {
      console.log('❌ Falha no Google:', error);
      toast.error('Falha na comunicação com o Google.');
    },
  });

  return (
    <button 
      onClick={() => login()}
      type="button"
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