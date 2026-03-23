import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import useRelationshipStore from '../store/useRelationshipStore';

const ConnectionsModal = ({ isOpen, onClose, profileId, initialTab }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { following, follow, unfollow } = useRelationshipStore();

  const fetchConnections = useCallback(
    async (tab) => {
      setLoading(true);
      try {
        const response = await api.get(
          `/accounts/profiles/${profileId}/connections/`,
          { params: { type: tab } }
        );

        const data = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];

        setUsers(data);
      } catch (error) {
        console.error('Erro ao buscar conexões:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [profileId]
  );

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    fetchConnections(initialTab);
  }, [isOpen, initialTab, fetchConnections]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    fetchConnections(tab);
  };

  const handleToggleFollow = async (e, u) => {
    e.stopPropagation();

    const targetId = String(u.profile_id);
    if (!targetId) return;

    const username = u.username;
    const isCurrentlyFollowing = following.includes(targetId);

    // 1. AÇÃO OTIMISTA
    if (isCurrentlyFollowing) {
      unfollow(targetId);
    } else {
      follow(targetId);
    }

    setBusyId(targetId);

    try {
      const response = await api.post(`/accounts/profiles/${targetId}/follow/`);

      // ✅ ADICIONADO: Se o servidor responder 200/201, mostramos a mensagem
      if (response.status === 200 || response.status === 201) {
        if (!isCurrentlyFollowing) {
          toast.success(`Agora você segue @${username}! 🎉`);
        } else {
          toast.info(`Você deixou de seguir @${username}.`);
        }
      }
    } catch (err) {
      // 2. ROLLBACK (Se der erro real, desfazemos a mudança visual)
      if (isCurrentlyFollowing) {
        follow(targetId);
      } else {
        unfollow(targetId);
      }

      const errorData = err.response?.data;

      // Tratamento para o erro de Cooldown (Aquele do seu log)
      if (errorData?.cooldown) {
        toast.warning(errorData.error);
      } else {
        toast.error(`Não foi possível atualizar @${username}.`);
      }
    } finally {
      setBusyId(null);
    }
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-black border border-gray-800 w-full max-w-sm rounded-2xl h-[450px] flex flex-col overflow-hidden shadow-2xl">
        <div
          data-cy="connections-modal"
          className="flex items-center justify-between p-4 border-b border-gray-800"
        >
          <h3 className="text-white font-bold text-[15px]">Connections</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-800">
          {['followers', 'following'].map((tab) => (
            <button
              key={tab}
              data-cy={`tab-${tab}`}
              onClick={() => handleTabChange(tab)}
              className={`flex-1 py-3 text-sm font-bold transition-all ${
                activeTab === tab
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'followers' ? 'Followers' : 'Following'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : users.length > 0 ? (
            users.map((u) => {
              // Aplica a mesma lógica de ID na renderização
              const targetId = String(
                u.profile_id || u.id || u.pk || u.user_id || u.user?.id
              );
              const myId = String(
                currentUser?.profile_id || currentUser?.id || currentUser?.pk
              );
              const isMe = targetId === myId;
              const isFollowingThisUser = following.includes(targetId);

              return (
                <div
                  key={targetId}
                  data-cy={`connection-item-${u.username}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-white/5 cursor-pointer transition-colors border-b border-gray-900 last:border-0"
                  onClick={() => {
                    onClose();
                    navigate(`/profile/${targetId}`);
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.profile_picture || '/default-avatar.png'}
                      alt={u.username}
                      className="w-10 h-10 rounded-full object-cover border border-gray-800"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-white font-bold text-sm truncate">
                        {u.display_name || u.username}
                      </span>
                      <span className="text-gray-500 text-xs truncate">
                        @{u.username}
                      </span>
                    </div>
                  </div>

                  {!isMe && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleFollow(e, u)}
                      disabled={busyId === targetId}
                      className={`text-xs font-extrabold px-4 py-1.5 rounded-full border transition min-w-[90px] ${
                        isFollowingThisUser
                          ? 'border-gray-600 text-white bg-transparent'
                          : 'border-blue-500 text-white bg-blue-500/10'
                      } ${busyId === targetId ? 'opacity-50' : ''}`}
                    >
                      {isFollowingThisUser ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div
              data-cy="empty-connections-message"
              className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center"
            >
              <p className="text-sm">No connections found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionsModal;
