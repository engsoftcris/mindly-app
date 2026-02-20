import React, { useState, useEffect } from 'react';
import api from '../api/axios'; // Usando o teu axios já configurado
import { FaHeart, FaComment, FaUserPlus, FaTimes } from 'react-icons/fa';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications/');
      setNotifications(response.data);
      
      // Opcional: Marcar todas como lidas ao abrir a página
      if (response.data.some(n => !n.is_read)) {
        await api.post('/notifications/mark_all_as_read/');
      }
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'LIKE': return <FaHeart className="text-pink-600" size={22} />;
      case 'COMMENT': return <FaComment className="text-blue-400" size={22} />;
      case 'FOLLOW': return <FaUserPlus className="text-blue-500" size={22} />;
      default: return null;
    }
  };

  const getMessage = (type) => {
    switch (type) {
      case 'LIKE': return 'curtiu o teu post';
      case 'COMMENT': return 'comentou no teu post';
      case 'FOLLOW': return 'começou a seguir-te';
      default: return 'interagiu contigo';
    }
  };

  return (
    <div className="flex-1 border-r border-gray-800 min-h-screen bg-black">
      {/* Header Estilo Twitter */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-md p-4 border-b border-gray-800">
        <h2 className="text-xl font-bold text-white">Notificações</h2>
      </div>

      {loading ? (
        <div className="p-10 text-center text-gray-500">A carregar...</div>
      ) : (
        <div className="divide-y divide-gray-800">
          {notifications.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              Ainda não tens notificações.
            </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={`p-4 flex gap-4 transition hover:bg-white/5 ${!n.is_read ? 'bg-blue-900/10' : ''}`}
              >
                <div className="mt-1">
                  {getIcon(n.notification_type)}
                </div>
                
                <div className="flex flex-col gap-2">
                  <img 
                    src={n.sender_avatar || `https://ui-avatars.com/api/?name=${n.sender_name}`}
                    className="w-10 h-10 rounded-full border border-gray-800"
                    alt="avatar"
                  />
                  <div className="text-white text-[15px]">
                    <span className="font-bold">{n.sender_name}</span> {getMessage(n.notification_type)}
                  </div>
                  {n.post_content && (
                    <p className="text-gray-500 text-sm line-clamp-2 italic">
                      "{n.post_content}"
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;