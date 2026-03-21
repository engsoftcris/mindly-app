import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { googleLoginApi } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import useRelationshipStore from '../store/useRelationshipStore';
import api from '../api/axios';

const GoogleLoginButton = ({ onLoadingChange }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      onLoadingChange?.(true);

      // Tempo mínimo de 1.5 segundos para mostrar o loading
      const minWait = new Promise((resolve) => setTimeout(resolve, 1500));

      try {
        const response = await googleLoginApi(tokenResponse.access_token);

        localStorage.setItem('access', response.data.access);
        localStorage.setItem('refresh', response.data.refresh);

        api.defaults.headers.common['Authorization'] =
          `Bearer ${response.data.access}`;

        // Carrega os dados no Zustand
        const syncPromise = api.get('/accounts/profiles/relationships-sync/');

        // Aguarda tanto a API quanto o tempo mínimo
        const [syncResponse] = await Promise.all([syncPromise, minWait]);
        useRelationshipStore.getState().setInitialData(syncResponse.data);

        toast.success('Login realizado com sucesso!');
        navigate('/');
      } catch (error) {
        // Também aguarda o tempo mínimo mesmo no erro
        await minWait;

        const errorMsg =
          error.response?.data?.detail || 'Erro ao autenticar no servidor.';
        toast.error(`Erro: ${errorMsg}`);
        setIsLoading(false);
        onLoadingChange?.(false);
      }
    },
    onError: async (_error) => {
      // Tempo mínimo para o erro também
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.error('Falha na comunicação com o Google.');
      setIsLoading(false);
      onLoadingChange?.(false);
    },
  });

  if (isLoading) {
    return (
      <button
        disabled
        className="
          w-full flex justify-center items-center 
          gap-3 py-3 px-4 
          bg-gray-400
          text-black font-bold text-sm
          rounded-xl shadow-sm 
          cursor-wait
        "
      >
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
        Entrando...
      </button>
    );
  }

  return (
    <button
      onClick={() => login()}
      type="button"
      aria-label="Continuar com Google"
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
        data-cy="google-icon"
        src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
        alt="Google logo"
      />
      Continuar com Google
    </button>
  );
};

export default GoogleLoginButton;
