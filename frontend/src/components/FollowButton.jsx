import React, { useState, useEffect } from 'react'; // 1. Importa useEffect
import api from '../api/axios';
import { toast } from 'react-toastify';

const FollowButton = ({ profileId, initialIsFollowing, onStatusChange }) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  // 2. Sincroniza o estado se a prop mudar (ex: após um F5 ou navegação)
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const handleToggleFollow = async (e) => {
    e.stopPropagation();
    setLoading(true);
    
    try {
      const response = await api.post(`/accounts/profiles/${profileId}/follow/`);
      
      // 3. Lógica baseada no Status Code do Django
      // 201 = Criou/Reativou Follow | 200 = Deu Unfollow
      const followResult = response.status === 201;
      
      setIsFollowing(followResult);
      toast.success(response.data.message);

      if (onStatusChange) onStatusChange(followResult);
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Erro ao processar pedido";
      
      toast.info(errorMessage, {
        icon: "⏳",
        position: "bottom-center"
      });

      // 4. Se deu erro (ex: 400), o isFollowing deve continuar como estava
      // Não invertemos o estado aqui.
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleFollow}
      disabled={loading}
      className={`
        px-6 py-2 rounded-full font-bold transition-all duration-200
        ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
        ${isFollowing 
          ? 'bg-black text-white border border-gray-700 hover:border-red-500' 
          : 'bg-white text-black hover:bg-gray-200 shadow-md'
        }
      `}
    >
      {loading ? '...' : isFollowing ? 'Seguindo' : 'Seguir'}
    </button>
  );
};

export default FollowButton;