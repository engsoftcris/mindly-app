// frontend/src/components/UserActionMenu.jsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const UserActionMenu = ({
  targetProfile,
  currentUserId,
  postId,
  isOwnPost,
  onActionComplete,
  onEditClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Detecta se o perfil já está bloqueado (campo que vem do seu Serializer)
  const isBlocked = targetProfile?.is_blocked;

  useEffect(() => {
    if (!isOpen) setConfirmDelete(false);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const username = targetProfile?.username || targetProfile?.user?.username || 'user';
  const profileId = targetProfile?.id || targetProfile?.pk;

 const targetUserId = useMemo(() => {
  // Vamos ver exatamente o que tem nesse objeto no console
  
  const v = targetProfile?.id || targetProfile?.profile_id || targetProfile?.user_id;
  
  const finalId = v ? String(v) : null;
  return finalId;
}, [targetProfile]);

// No canBlock, vamos logar a comparação
const canBlock = useMemo(() => {
  const cur = String(currentUserId || "");
  const tar = String(targetUserId || "");
  const result = !!(profileId && cur && tar && cur !== tar);
  
  return result;
}, [profileId, currentUserId, targetUserId]);


  // Função unificada para Bloquear/Desbloquear (Toggle)
  const handleToggleBlock = async (e) => {
    e.stopPropagation();
    if (!profileId) return;

    try {
      // Chama o endpoint de sempre
      await api.post(`/accounts/profiles/${profileId}/block/`);
      
      // Mensagem dinâmica baseada no estado anterior
      const actionLabel = isBlocked ? 'unblocked' : 'blocked';
      toast.success(`@${username} ${actionLabel}.`);
      
      setIsOpen(false);

      if (onActionComplete) {
        // Notifica o pai para atualizar o estado local ou remover o post
        onActionComplete(profileId);
      }
      
      // Se estivermos bloqueando (não desbloqueando) a partir de um perfil, volta para o feed
      if (!isBlocked && window.location.pathname.includes('/profile/')) {
        navigate('/feed');
      }
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        'Action failed.';
      toast.error(msg);
    }
  };

  const handleDeletePost = async (e) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await api.delete(`/accounts/posts/${postId}/`);
      toast.success('Post deleted.');
      setIsOpen(false);
      if (onActionComplete) onActionComplete(postId);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Could not delete post.';
      toast.error(msg);
    }
  };

  return (
    <div data-cy="user-action-menu" className="relative inline-block" ref={menuRef}>
      <button
        data-cy="user-action-menu-trigger"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((v) => !v);
        }}
        className="p-2 text-gray-500 hover:text-white rounded-full transition-colors hover:bg-white/10"
        type="button"
        aria-expanded={isOpen}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {isOpen && (
        <div
          data-cy="user-action-menu-panel"
          className="absolute right-0 mt-2 w-48 bg-black border border-gray-800 rounded-xl shadow-2xl z-[999] overflow-hidden"
          role="menu"
        >
          <div data-cy="user-action-menu-items" className="py-1">
            {isOwnPost ? (
              <div data-cy="user-action-menu-own-post" className="flex flex-col">
                {!confirmDelete && (
                  <button
                    data-cy="user-action-edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      if (onEditClick) onEditClick();
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-white hover:bg-white/5 flex items-center gap-2"
                    type="button"
                  >
                    ✏️ Edit post
                  </button>
                )}

                <button
                  data-cy={confirmDelete ? 'user-action-confirm-delete' : 'user-action-delete'}
                  onClick={handleDeletePost}
                  className={`w-full text-left px-4 py-3 text-sm font-bold transition-all duration-200 ${
                    confirmDelete
                      ? 'bg-red-600 text-white text-center'
                      : 'text-red-500 hover:bg-white/5 flex items-center gap-2'
                  }`}
                  type="button"
                >
                  {confirmDelete ? 'CONFIRM DELETE?' : '🗑️ Delete post'}
                </button>

                {confirmDelete && (
                  <button
                    data-cy="user-action-cancel-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDelete(false);
                    }}
                    className="w-full text-center px-4 py-2 text-xs text-gray-400 hover:bg-white/10 transition-colors border-t border-gray-800"
                    type="button"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ) : (
              <>
                {canBlock && (
                  <button
                    // O data-cy agora muda dinamicamente para o Cypress encontrar
                    data-cy={isBlocked ? "user-action-unblock" : "user-action-block"}
                    onClick={handleToggleBlock}
                    className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-white/5 font-bold flex items-center gap-2"
                    type="button"
                  >
                    {isBlocked ? (
                      <><span className="text-lg">🔓</span> Unblock @{username}</>
                    ) : (
                      <><span className="text-lg">🚫</span> Block @{username}</>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserActionMenu;