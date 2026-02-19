import React, { useState, useRef, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const UserActionMenu = ({ targetProfile, postId, isOwnPost, onActionComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) setConfirmDelete(false);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const username = targetProfile?.username || targetProfile?.user?.username || "utilizador";
  const profileId = targetProfile?.id || targetProfile?.pk;

  const handleBlock = async (e) => {
    e.stopPropagation();
    if (!profileId) return;
    try {
      await api.post(`/accounts/profiles/${profileId}/block/`);
      toast.success(`@${username} bloqueado.`);
      setIsOpen(false);
      if (onActionComplete) onActionComplete(profileId);
      navigate('/feed');
    } catch (err) {
      toast.error("Erro ao bloquear.");
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
      toast.success("Post eliminado.");
      setIsOpen(false);
      if (onActionComplete) onActionComplete(postId);
    } catch (err) {
      toast.error("Erro ao eliminar.");
    }
  };

  return (
    <div data-cy="user-action-menu" className="relative inline-block" ref={menuRef}>
      <button
        data-cy="user-action-menu-trigger"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 text-gray-500 hover:text-white rounded-full transition-colors hover:bg-white/10"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="menu"
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
                <button
                  data-cy={confirmDelete ? "user-action-confirm-delete" : "user-action-delete"}
                  onClick={handleDeletePost}
                  className={`w-full text-left px-4 py-3 text-sm font-bold transition-all duration-200 ${
                    confirmDelete
                      ? "bg-red-600 text-white text-center"
                      : "text-red-500 hover:bg-white/5"
                  }`}
                  type="button"
                >
                  {confirmDelete ? "CONFIRMAR DELETAR?" : "🗑️ Deletar Post"}
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
                    Cancelar
                  </button>
                )}
              </div>
            ) : (
              <button
                data-cy="user-action-block"
                onClick={handleBlock}
                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-white/5 font-bold"
                type="button"
              >
                🚫 Bloquear @{username}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserActionMenu;
