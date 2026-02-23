import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FaHeart, FaComment, FaUserPlus, FaShieldAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/notifications/');
        // Suporta retorno paginado (results) ou array direto
        const data = Array.isArray(response.data) ? response.data : response.data?.results;
        setNotifications(data || []);
      } catch (error) {
        console.error('Erro ao carregar notificações', error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAsReadLocal = (id) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );
  };

  const handleNotificationClick = async (n) => {
    // 1) Marcar como lida (otimista)
    if (!n.is_read) {
      markAsReadLocal(n.id);
      try {
        await api.post(`/notifications/${n.id}/mark_as_read/`);
      } catch (err) {
        console.error(err);
        // opcional: reverter estado em caso de falha
      }
    }

    // 2) Roteamento por tipo
    const isReport = n.notification_type === 'REPORT_UPDATE';
    if (isReport) {
      // Inferência simples: "aceite"/"removido" => resolved => post soft-deleted (não navega)
      const text = (n.text || '').toLowerCase();
      const isResolved = text.includes('aceite') || text.includes('removido');

      if (isResolved) {
        // Mostrar snapshot do conteúdo
        if (n.stored_post_content) {
          toast.info(`Conteúdo removido: "${n.stored_post_content}"`);
        } else {
          toast.info('O conteúdo original foi removido da plataforma.');
        }
        return;
      }

      // Ignorada => post deve existir => navegar pro feed destacando
      if (n.post) {
        navigate(`/?highlight=${n.post}`);
      } else {
        toast.info('Não foi possível abrir o post desta notificação.');
      }
      return;
    }

    if (n.notification_type === 'FOLLOW') {
      if (n.sender_uuid) {
        navigate(`/profile/${n.sender_uuid}`);
      } else {
        toast.info('Não foi possível abrir o perfil do usuário.');
      }
      return;
    }

    // LIKE / COMMENT => navega pro post
    if (n.post) {
      navigate(`/?highlight=${n.post}`);
      return;
    }

    toast.info('Notificação sem destino de navegação.');
  };

  const renderIcon = (n) => {
    if (n.notification_type === 'LIKE') return <FaHeart className="text-pink-600" size={20} />;
    if (n.notification_type === 'COMMENT') return <FaComment className="text-blue-400" size={20} />;
    if (n.notification_type === 'FOLLOW') return <FaUserPlus className="text-blue-500" size={20} />;
    if (n.notification_type === 'REPORT_UPDATE') return <FaShieldAlt className="text-amber-500" size={20} />;
    return null;
  };

  const renderBody = (n) => {
    const isReport = n.notification_type === 'REPORT_UPDATE';

    if (isReport) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-gray-200">{n.text || 'Atualização de denúncia'}</span>
          {(n.stored_post_content || n.post_content) && (
            <p className="text-gray-500 text-sm italic mt-1">
              "{n.stored_post_content || n.post_content}"
            </p>
          )}
        </div>
      );
    }

    const senderName = n.sender_name || 'User';

    return (
      <>
        <span className="font-bold">{senderName}</span>{' '}
        {n.notification_type === 'LIKE' && 'curtiu seu post'}
        {n.notification_type === 'COMMENT' && 'comentou no seu post'}
        {n.notification_type === 'FOLLOW' && 'começou a te seguir'}

        {n.post_content && (
          <p className="text-gray-500 text-sm line-clamp-2 italic mt-1 leading-relaxed">
            "{n.post_content}"
          </p>
        )}
      </>
    );
  };

  const renderAvatar = (n) => {
    const isReport = n.notification_type === 'REPORT_UPDATE';
    if (isReport) {
      return (
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
          <FaShieldAlt className="text-amber-500" size={16} />
        </div>
      );
    }

    const senderName = n.sender_name || 'User';
    const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}`;

    return (
      <img
        src={n.sender_avatar || fallback}
        className="w-10 h-10 rounded-full border border-gray-800 object-cover"
        alt="avatar"
      />
    );
  };

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans">
      <div className="p-4 border-b border-gray-800 sticky top-0 bg-black/80 backdrop-blur-md z-10">
        <h2 className="text-xl font-bold text-white">Notificações</h2>
      </div>

      {loading ? (
        <div className="p-10 text-center text-gray-500">Carregando...</div>
      ) : (
        <div className="divide-y divide-gray-800">
          {notifications.length === 0 ? (
            <div className="p-10 text-center text-gray-500">Nenhuma notificação.</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-4 flex gap-4 transition cursor-pointer hover:bg-white/[0.03]
                  ${!n.is_read ? 'bg-blue-500/5 border-l-2 border-blue-500' : ''}`}
              >
                <div className="mt-1">{renderIcon(n)}</div>

                <div className="flex flex-col gap-2 flex-1">
                  {renderAvatar(n)}
                  <div className="text-white text-[15px]">{renderBody(n)}</div>
                </div>

                {!n.is_read && <div className="w-2 h-2 bg-blue-500 rounded-full self-center" />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;