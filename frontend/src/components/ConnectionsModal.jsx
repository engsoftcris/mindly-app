import React, { useState, useEffect, useCallback } from 'react'; // 1. Adicionado useCallback
import { X } from 'lucide-react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const ConnectionsModal = ({ isOpen, onClose, profileId, initialTab }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // 2. Envolvemos a função em useCallback
  const fetchConnections = useCallback(
    async (tab) => {
      setLoading(true);
      try {
        const response = await api.get(
          `/accounts/profiles/${profileId}/connections/`,
          {
            params: { type: tab },
          }
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
  ); // A função só muda se o profileId mudar

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);
    fetchConnections(initialTab);
  }, [isOpen, initialTab, fetchConnections]); // 3. Adicionado fetchConnections aqui

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    fetchConnections(tab);
  };

  const handleToggleFollow = async (e, u) => {
    e.stopPropagation();
    if (
      !u?.profile_id ||
      (currentUser && String(currentUser.id) === String(u.profile_id))
    )
      return;

    const prev = u.is_following;
    const username = u.display_name || u.username;

    setUsers((arr) =>
      arr.map((item) =>
        item.profile_id === u.profile_id
          ? { ...item, is_following: !prev }
          : item
      )
    );

    setBusyId(u.profile_id);
    try {
      const res = await api.post(`/accounts/profiles/${u.profile_id}/follow/`);
      if (res?.data?.is_following !== undefined) {
        setUsers((arr) =>
          arr.map((item) =>
            item.profile_id === u.profile_id
              ? { ...item, is_following: res.data.is_following }
              : item
          )
        );
        res.data.is_following
          ? toast.success(`Seguindo ${username}!`)
          : toast.info(`Deixou de seguir ${username}.`);
      }
    } catch (_err) {
      // 4. Já está usando _err, perfeito
      setUsers((arr) =>
        arr.map((item) =>
          item.profile_id === u.profile_id
            ? { ...item, is_following: prev }
            : item
        )
      );
      toast.error('Falha na operação.');
    } finally {
      setBusyId(null);
    }
  };

  if (!isOpen) return null;

  return (
    // ... restante do JSX sem alterações
    <div
      data-cy="connections-modal"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      {/* ... o código do seu modal continua exatamente o mesmo daqui pra baixo */}
      <div className="bg-black border border-gray-800 w-full max-w-sm rounded-2xl h-[450px] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-white font-bold">Connections</h3>
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
              className={`flex-1 py-3 text-sm font-semibold transition-all ${
                activeTab === tab
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'followers' ? 'Followers' : 'Following'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : users.length > 0 ? (
            users.map((u) => {
              const isMe =
                currentUser && String(currentUser.id) === String(u.profile_id);
              return (
                <div
                  key={u.profile_id}
                  data-cy={`connection-item-${u.username}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => {
                    onClose();
                    navigate(`/profile/${u.profile_id}`);
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.profile_picture || '/default-avatar.png'}
                      alt={u.username}
                      className="w-10 h-10 rounded-full object-cover border border-gray-700"
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
                      data-cy="follow-button"
                      onClick={(e) => handleToggleFollow(e, u)}
                      disabled={busyId === u.profile_id}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition ${
                        u.is_following
                          ? 'border-gray-600 text-white'
                          : 'border-blue-500 text-white bg-blue-500/20'
                      } ${busyId === u.profile_id ? 'opacity-50' : ''}`}
                    >
                      {u.is_following ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
              <p data-cy="empty-connections-message" className="text-sm">
                No connections found in this list.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConnectionsModal;
