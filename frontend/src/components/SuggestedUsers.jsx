import React, { useEffect, useState } from 'react';
import api from '../api/axios'; 
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const SuggestedUsers = () => {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [followingIds, setFollowingIds] = useState(new Set()); // Para controle otimista

    const fetchSuggestions = async () => {
        try {
            const response = await api.get('/accounts/suggested-follows/');
            const data = response.data.results || response.data;
            setSuggestions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao buscar sugestões:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuggestions();
    }, []);

    const handleFollow = async (profileId, username) => {
        // Atualização otimista
        setFollowingIds(prev => new Set(prev).add(profileId));
        
        try {
            const response = await api.post(`/accounts/profiles/${profileId}/follow/`);
            
            // Verificar se é um refollow (depois de unfollow)
            if (response.status === 200) {
                toast.success(`Você voltou a seguir @${username}! 🎉`);
            } else {
                toast.success(`Agora você segue @${username}! 🎉`);
            }
            
            // Remove da lista local
            setSuggestions(prev => prev.filter(p => p.id !== profileId));
        } catch (err) {
            // Rollback da atualização otimista
            setFollowingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(profileId);
                return newSet;
            });

            // Verificar se é erro de cooldown (5 minutos)
            if (err.response?.status === 400 && err.response?.data?.cooldown) {
                const minutes = err.response.data.minutes_remaining || 5;
                
                toast.warning(
                    <div>
                        <p className="font-bold">⏱️ Aguarde {minutes} minutos</p>
                        <p className="text-sm opacity-90">
                            Você poderá seguir @{username} novamente em {minutes} minutos.
                        </p>
                    </div>,
                    { autoClose: 5000 }
                );
            } else {
                console.error("Erro detalhado do follow:", err.response?.data);
                toast.error(`Não foi possível seguir @${username}.`);
            }
        }
    };

    if (loading) return <div className="p-4 text-gray-500 animate-pulse">Carregando...</div>;
    if (suggestions.length === 0) return null;

    return (
        <div className="bg-[#16181C] rounded-2xl border border-gray-800 overflow-hidden w-full">
            <h2 className="text-xl font-bold p-4 text-white">Quem seguir</h2>
            <div className="flex flex-col">
                {suggestions.map((profile) => {
                    console.log("ESTRUTURA COMPLETA:", profile);

                    const displayUsername = profile.user?.username || profile.username || "Sem Nome";
                    const displayFullName = profile.user?.full_name || profile.display_name || profile.full_name || displayUsername;
                    const displayAvatar = profile.avatar || profile.profile_picture || profile.user?.profile?.avatar;
                    const profileId = profile.id;
                    const isFollowing = followingIds.has(profileId);

                    return (
                        <div 
                            data-cy="suggested-item" 
                            key={profile.id} 
                            className="flex items-center justify-between p-4 border-t border-gray-800 hover:bg-white/5 transition-colors"
                        >
                            <Link 
                                to={`/profile/${profileId}`}
                                className="flex items-center gap-3 flex-1 min-w-0"
                                onClick={() => setSuggestions(prev => prev)} // só pra fechar?
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                                    {displayAvatar && (
                                        <img 
                                            src={displayAvatar.startsWith('http') ? displayAvatar : `http://localhost:8000${displayAvatar}`} 
                                            className="w-full h-full object-cover"
                                            alt="avatar"
                                        />
                                    )}
                                </div>
                                
                                <div className="flex flex-col min-w-0">
                                    <span data-cy="full-name" className="text-white font-bold truncate">
                                        {displayFullName}
                                    </span>
                                    <span data-cy="username" className="text-gray-500 text-sm truncate">
                                        @{displayUsername}
                                    </span>
                                </div>
                            </Link>

                            <button
                                data-cy="follow-button" 
                                onClick={() => handleFollow(profileId, displayUsername)}
                                disabled={isFollowing}
                                className={`bg-white text-black px-4 py-1 rounded-full font-bold text-sm ml-2 flex-shrink-0 transition-all ${
                                    isFollowing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'
                                }`}
                            >
                                {isFollowing ? '...' : 'Seguir'}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SuggestedUsers;