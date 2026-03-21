// frontend/src/components/SuggestedUsers.jsx
import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import useRelationshipStore from '../store/useRelationshipStore';

const SuggestedUsers = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Zustand (source of truth)
  const { follow, unfollow, following } = useRelationshipStore();

  const fetchSuggestions = async () => {
    try {
      const response = await api.get('/accounts/suggested-follows/');
      const data = response.data.results || response.data;
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao buscar sugestões:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleFollow = async (profileId, username) => {
    const id = String(profileId);

    // ✅ otimista (GLOBAL)
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

      // remove da lista local
      setSuggestions((prev) => prev.filter((p) => p.id !== profileId));
    } catch (err) {
      // ❌ rollback
      unfollow(id);

      if (err.response?.status === 400 && err.response?.data?.cooldown) {
        const minutes = err.response.data.minutes_remaining || 5;

        toast.warning(
          `⏱️ Aguarde ${minutes} minutos para seguir @${username} novamente.`
        );
      } else {
        console.error('Erro detalhado do follow:', err.response?.data);
        toast.error(`Não foi possível seguir @${username}.`);
      }
    }
  };

  if (loading) {
    return (
      <div
        className="p-4 text-gray-500 animate-pulse"
        data-cy="loading-suggestions"
      >
        Carregando...
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

          // ✅ estado global
          const isFollowing = following.includes(id);

          const displayUsername =
            profile.user?.username || profile.username || 'Sem Nome';

          const displayFullName =
            profile.user?.full_name ||
            profile.display_name ||
            profile.full_name ||
            displayUsername;

          const displayAvatar =
            profile.avatar ||
            profile.profile_picture ||
            profile.user?.profile?.avatar;

          return (
            <div
              key={profile.id}
              data-cy="suggested-item"
              className="flex items-center justify-between p-4 border-t border-gray-800 hover:bg-white/5 transition-colors"
            >
              <Link
                to={`/profile/${profileId}`}
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                  {displayAvatar && (
                    <img
                      src={
                        displayAvatar.startsWith('http')
                          ? displayAvatar
                          : `http://localhost:8000${displayAvatar}`
                      }
                      className="w-full h-full object-cover"
                      alt="avatar"
                    />
                  )}
                </div>

                <div className="flex flex-col min-w-0">
                  <span
                    data-cy="full-name"
                    className="text-white font-bold truncate"
                  >
                    {displayFullName}
                  </span>
                  <span
                    data-cy="username"
                    className="text-gray-500 text-sm truncate"
                  >
                    @{displayUsername}
                  </span>
                </div>
              </Link>

              <button
                onClick={() => handleFollow(profileId, displayUsername)}
                disabled={isFollowing}
                data-cy="follow-button"
                className={`bg-white text-black px-4 py-1 rounded-full font-bold text-sm ml-2 flex-shrink-0 transition-all ${
                  isFollowing
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-gray-200'
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
