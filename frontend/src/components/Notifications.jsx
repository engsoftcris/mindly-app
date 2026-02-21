import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaHeart, FaComment, FaUserPlus } from 'react-icons/fa';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications/');
        setNotifications(response.data);
      } catch (error) {
        console.error("Erro ao carregar notificações", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const handleNotificationClick = async (n) => {
    // Dá baixa na notificação individual no backend
    if (!n.is_read) {
      try {
        await api.post(`/notifications/${n.id}/mark_as_read/`);
        // Atualiza o estado local para sumir o sinal de "novo"
        setNotifications(notifications.map(item => 
          item.id === n.id ? { ...item, is_read: true } : item
        ));
      } catch (err) { console.error(err); }
    }

    // Navegação individual estilo Twitter
   if (n.notification_type === 'FOLLOW') {
    // Agora enviamos o UUID correto para a URL
    if (n.sender_uuid) {
      navigate(`/profile/${n.sender_uuid}`);
    } else {
      console.error("UUID não encontrado na notificação");
    }
  } else if (n.post) {
    navigate(`/?highlight=${n.post}`);
  }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="p-4 border-b border-gray-800 sticky top-0 bg-black/80 backdrop-blur-md z-10">
        <h2 className="text-xl font-bold text-white">Notificações</h2>
      </div>

      {loading ? (
        <div className="p-10 text-center text-gray-500">Carregando...</div>
      ) : (
        <div className="divide-y divide-gray-800">
          {notifications.map((n) => (
            <div 
              key={n.id} 
              onClick={() => handleNotificationClick(n)}
              className={`p-4 flex gap-4 cursor-pointer transition hover:bg-white/[0.03] ${!n.is_read ? 'bg-blue-500/5' : ''}`}
            >
              <div className="mt-1">
                {n.notification_type === 'LIKE' && <FaHeart className="text-pink-600" size={20} />}
                {n.notification_type === 'COMMENT' && <FaComment className="text-blue-400" size={20} />}
                {n.notification_type === 'FOLLOW' && <FaUserPlus className="text-blue-500" size={20} />}
              </div>
              
              <div className="flex flex-col gap-1 flex-1">
                <img 
                  src={n.sender_avatar || `https://ui-avatars.com/api/?name=${n.sender_username}`}
                  className="w-10 h-10 rounded-full border border-gray-800 object-cover mb-1"
                  alt="avatar"
                />
                <div className="text-white text-[15px]">
                  <span className="font-bold">{n.sender_name || n.sender_username}</span>{' '}
                  {n.notification_type === 'LIKE' && 'curtiu seu post'}
                  {n.notification_type === 'COMMENT' && 'comentou no seu post'}
                  {n.notification_type === 'FOLLOW' && 'começou a te seguir'}
                </div>
                {n.post_content && (
                  <p className="text-gray-500 text-sm line-clamp-2 italic italic mt-1">"{n.post_content}"</p>
                )}
              </div>
              {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full self-center"></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;