// frontend/src/components/SuggestedUsers.jsx
import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import useRelationshipStore from '../store/useRelationshipStore';
import { useAuth } from '../context/AuthContext'; // 👈 Importe o context de auth

const SuggestedUsers = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth(); // 👈 Pegue o user
  const location = useLocation(); // 👈 Para reagir a mudanças de rota

  const { follow, unfollow, following } = useRelationshipStore();

  const fetchSuggestions = useCallback(async () => {
    if (!user) return; // Não busca se não estiver logado

    try {
      const response = await api.get('/accounts/suggested-follows/');
      const data = response.data.results || response.data;
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao buscar sugestões:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Busca inicial e toda vez que mudar de página (opcional, para manter fresco)
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions, location.pathname]);

  const handleFollow = async (profileId, username) => {
    const id = String(profileId);
    follow(id);

    try {
      const response = await api.post(
        `/accounts/profiles/${profileId}/follow/`
      );

      if (response.status === 200) {
        toast.success(`Você voltou a seguir @${username}! 🎉`);
      } else {
        toast.success(`Agora você segue @${username}! 🎉`);
      }

      // Remove da lista local com um pequeno delay para a transição ser suave
      setSuggestions((prev) => {
        const newlist = prev.filter((p) => String(p.id) !== id);
        // Se a lista ficar vazia, busca novas sugestões
        if (newlist.length === 0) fetchSuggestions();
        return newlist;
      });
    } catch (err) {
      unfollow(id);
      if (err.response?.status === 400 && err.response?.data?.cooldown) {
        const minutes = err.response.data.minutes_remaining || 0;
        toast.warning(
          `⏱️ Aguarde ${minutes} min para seguir @${username} novamente.`
        );
      } else {
        toast.error(`Não foi possível seguir @${username}.`);
      }
    }
  };

  if (loading && suggestions.length === 0) {
    return (
      <div className="p-4 text-gray-500 animate-pulse">
        Carregando sugestões...
      </div>
    );
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-[#16181C] rounded-2xl border border-gray-800 overflow-hidden w-full">
      <h2 className="text-xl font-bold p-4 text-white">Quem seguir</h2>
      <div className="flex flex-col">
        {suggestions.map((profile) => {
          const profileId = profile.id;
          const id = String(profileId);
          const isFollowing = following.includes(id);

          const displayUsername =
            profile.user?.username || profile.username || 'user';
          const displayFullName =
            profile.user?.full_name || profile.display_name || displayUsername;
          const displayAvatar =
            profile.profile_picture || profile.user?.profile?.profile_picture;

          return (
            <div
              key={id}
              data-cy="suggested-item"
              className="flex items-center justify-between p-4 border-t border-gray-800 hover:bg-white/5 transition-colors"
            >
              <Link
                to={`/profile/${profileId}`}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <div className="w-10 h-10 rounded-full bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-700">
                  <img
                    src={
                      displayAvatar ||
                      `https://ui-avatars.com/api/?name=${displayUsername}&background=random`
                    }
                    className="w-full h-full object-cover"
                    alt="avatar"
                    onError={(e) => {
                      e.target.src = `https://ui-avatars.com/api/?name=${displayUsername}`;
                    }}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-white font-bold truncate">
                    {displayFullName}
                  </span>
                  <span className="text-gray-500 text-sm truncate">
                    @{displayUsername}
                  </span>
                </div>
              </Link>

              <button
                onClick={() => handleFollow(profileId, displayUsername)}
                data-cy="follow-button"
                disabled={isFollowing}
                className={`px-4 py-1 rounded-full font-bold text-sm ml-2 transition-all ${
                  isFollowing
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {isFollowing ? 'Seguindo' : 'Seguir'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SuggestedUsers;
