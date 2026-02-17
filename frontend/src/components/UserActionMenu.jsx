import React, { useState, useRef, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';

const UserActionMenu = ({ targetProfile, postId, isOwnPost, onActionComplete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extração de dados segura para não crashar
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
    } catch (err) {
      toast.error("Erro ao bloquear.");
    }
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      {/* O BOTÃO QUE TEM QUE APARECER */}
      <button 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 text-gray-500 hover:text-white rounded-full transition-colors hover:bg-white/10"
        type="button"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-black border border-gray-800 rounded-xl shadow-2xl z-[999] overflow-hidden">
          <div className="py-1">
            {isOwnPost ? (
              <button className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-white/5 font-bold">
                🗑️ Eliminar Post
              </button>
            ) : (
              <button 
                onClick={handleBlock}
                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-white/5 font-bold"
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