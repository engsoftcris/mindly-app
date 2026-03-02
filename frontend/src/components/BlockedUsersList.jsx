import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';

const BlockedUsersList = () => {
  const [blockedProfiles, setBlockedProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      // Esta é a action que acabamos de testar no Pytest!
      const response = await api.get('/accounts/profiles/blocked-users/');
      // Se a sua API for direta (ReturnList), usamos response.data
      // Se for paginada, usamos response.data.results
      const data = Array.isArray(response.data) ? response.data : response.data.results || [];
      setBlockedProfiles(data);
    } catch (err) {
      toast.error('Could not load blocked users.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (profileId, username) => {
    try {
      // O mesmo endpoint de Toggle que já usamos
      await api.post(`/accounts/profiles/${profileId}/block/`);
      toast.success(`@${username} unblocked.`);
      
      // Remove da lista local instantaneamente
      setBlockedProfiles(prev => prev.filter(p => p.id !== profileId));
    } catch (err) {
      toast.error('Failed to unblock user.');
    }
  };

  if (loading) return <div className="p-4 text-center text-gray-500">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto bg-black min-h-screen border-x border-gray-800">
      <div className="p-4 border-b border-gray-800 flex items-center gap-4">
        <h2 className="text-xl font-bold text-white">Blocked Users</h2>
      </div>

      {blockedProfiles.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p>You haven't blocked anyone yet.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {blockedProfiles.map((profile) => (
            <div key={profile.id} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
              <Link to={`/profile/${profile.id}`} className="flex items-center gap-3 group">
                <img
                  src={profile.profile_picture || '/static/images/default-avatar.png'}
                  alt={profile.username}
                  className="w-12 h-12 rounded-full object-cover border border-gray-800"
                />
                <div>
                  <div className="font-bold text-white group-hover:underline">
                    {profile.display_name || profile.username}
                  </div>
                  <div className="text-gray-500 text-sm">@{profile.username}</div>
                </div>
              </Link>

              <button
                onClick={() => handleUnblock(profile.id, profile.username)}
                className="px-4 py-1.5 rounded-full border border-red-500 text-red-500 font-bold text-sm hover:bg-red-500/10 transition-colors"
                data-cy={`unblock-btn-${profile.username}`}
              >
                Unblock
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockedUsersList;