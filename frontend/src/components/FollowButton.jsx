import React, { useState } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import useRelationshipStore from '../store/useRelationshipStore';

const FollowButton = ({ profileId, initialIsFollowing, onStatusChange }) => {
  const [loading, setLoading] = useState(false);

  // Pega do Zustand
  const { following, follow, unfollow } = useRelationshipStore();

  // Usa Zustand como fonte de verdade, com fallback para initialIsFollowing
  const isFollowing =
    following.includes(String(profileId)) ?? initialIsFollowing;

  const handleToggleFollow = async (e) => {
    e.stopPropagation();
    setLoading(true);

    // Estado otimista
    const wasFollowing = isFollowing;

    // Atualiza UI otimista
    if (wasFollowing) {
      unfollow(String(profileId));
    } else {
      follow(String(profileId));
    }

    if (onStatusChange) onStatusChange(!wasFollowing);

    try {
      const response = await api.post(
        `/accounts/profiles/${profileId}/follow/`
      );

      // Confirma com o backend
      const newStatus = response.status === 201;

      if (newStatus !== !wasFollowing) {
        // Se o backend devolveu diferente, corrige
        if (newStatus) {
          follow(String(profileId));
        } else {
          unfollow(String(profileId));
        }
        if (onStatusChange) onStatusChange(newStatus);
      }

      toast.success(
        response.data.message ||
          (newStatus ? 'Agora você segue! 🎉' : 'Deixou de seguir.')
      );
    } catch (error) {
      // Rollback em caso de erro
      if (wasFollowing) {
        follow(String(profileId));
      } else {
        unfollow(String(profileId));
      }
      if (onStatusChange) onStatusChange(wasFollowing);

      toast.error(error.response?.data?.error || 'Erro ao processar pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      data-cy="follow-button"
      onClick={handleToggleFollow}
      disabled={loading}
      className={`
        px-6 py-2 rounded-full font-bold transition-all duration-200
        ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
        ${
          isFollowing
            ? 'bg-black text-white border border-gray-700 hover:border-red-500 hover:text-red-500'
            : 'bg-white text-black hover:bg-gray-200 shadow-md'
        }
      `}
    >
      {loading ? '...' : isFollowing ? 'Seguindo' : 'Seguir'}
    </button>
  );
};

export default FollowButton;
