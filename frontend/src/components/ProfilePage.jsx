import React, { useState, useEffect } from 'react';
import api from '../api/axios'; 
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
    const { updateUser } = useAuth(); 

    const [profile, setProfile] = useState({
        display_name: '',
        bio: '',
        username: '',
        email: '',
        is_private: false,
        followers: [] // 1. Estado para armazenar a lista de seguidores
    });

    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const response = await api.get('/accounts/profile/me/');
                setProfile({
                    display_name: response.data.display_name || response.data.full_name || '',
                    bio: response.data.bio || '',
                    username: response.data.username || '',
                    email: response.data.email || '',
                    is_private: response.data.is_private || false,
                    followers: response.data.followers || [] // Carrega seguidores da API
                });
                setLoading(false);
            } catch (error) {
                console.error("Error fetching profile:", error);
                setLoading(false);
            }
        };
        fetchProfileData();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setStatusMessage('Updating...');
        try {
            const response = await api.patch('/accounts/profile/me/', {
                display_name: profile.display_name,
                bio: profile.bio,
                is_private: profile.is_private
            });

            updateUser({ 
                display_name: response.data.display_name,
                bio: response.data.bio, 
                profile_picture: response.data.profile_picture,
                is_private: response.data.is_private
            });

            setStatusMessage('Profile updated successfully! ✅');
            setTimeout(() => setStatusMessage(''), 3000);
        } catch (error) {
            setStatusMessage('Failed to update profile. ❌');
        }
    };

    // 2. Função para remover seguidor (Lógica para a próxima Task)
    const handleRemoveFollower = async (followerId) => {
        if (!window.confirm("Are you sure you want to remove this follower?")) return;

        try {
            // Chamada para o endpoint que criaremos na lógica de seguidores
            await api.delete(`/accounts/followers/${followerId}/remove/`);
            
            // Atualiza o estado local removendo o usuário da lista
            setProfile({
                ...profile,
                followers: profile.followers.filter(f => f.id !== followerId)
            });
            alert("Follower removed.");
        } catch (error) {
            console.error("Failed to remove follower:", error);
            alert("Error removing follower.");
        }
    };

    if (loading) return <div className="text-white p-10 bg-[#0F1419] min-h-screen">Loading profile...</div>;

    return (
        <div className="min-h-screen bg-[#0F1419] text-white flex justify-center p-6">
            <div className="w-full max-w-xl space-y-6">
                
                {/* FORMULÁRIO DE CONFIGURAÇÕES */}
                <div className="bg-black border border-gray-800 rounded-2xl p-8 h-fit">
                    <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
                    
                    <form onSubmit={handleUpdate} className="space-y-6">
                        {/* Username - Disabled */}
                        <div>
                            <label className="block text-gray-500 text-sm mb-1">Username</label>
                            <input 
                                type="text" 
                                value={profile.username} 
                                disabled 
                                className="w-full bg-transparent border-b border-gray-800 py-2 opacity-50 cursor-not-allowed outline-none"
                            />
                        </div>

                        {/* Display Name */}
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Display Name</label>
                            <input 
                                type="text"
                                maxLength={50}
                                className="w-full bg-[#16181C] text-white p-3 rounded-lg border border-gray-800 focus:border-[#1D9BF0] outline-none transition"
                                value={profile.display_name}
                                onChange={(e) => setProfile({...profile, display_name: e.target.value})}
                            />
                        </div>

                        {/* Bio */}
                        <div>
                            <label className="block text-gray-400 text-sm mb-1 flex justify-between">
                                <span>Bio</span>
                                <span className="text-xs text-gray-600">{profile.bio.length}/160</span>
                            </label>
                            <textarea 
                                maxLength={160}
                                className="w-full bg-[#16181C] text-white p-3 rounded-lg border border-gray-800 focus:border-[#1D9BF0] outline-none h-32 resize-none transition"
                                value={profile.bio}
                                onChange={(e) => setProfile({...profile, bio: e.target.value})}
                            />
                        </div>

                        {/* Privacy Switch */}
                        <div className="flex items-center justify-between p-4 bg-[#16181C] rounded-xl border border-gray-800 group transition-all duration-200 hover:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${profile.is_private ? 'bg-indigo-500/10 text-indigo-400' : 'bg-gray-800 text-gray-500'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold">Private Profile</h3>
                                    <p className="text-xs text-gray-500">Only approved followers can see your posts.</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setProfile({ ...profile, is_private: !profile.is_private })}
                                className={`${
                                    profile.is_private ? 'bg-indigo-600' : 'bg-gray-700'
                                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                            >
                                <span className={`${profile.is_private ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                            </button>
                        </div>

                        <div className="flex flex-col items-center gap-4 pt-4">
                            <button 
                                type="submit"
                                disabled={statusMessage === 'Updating...'}
                                className="w-56 bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white font-bold py-2.5 rounded-full transition-all duration-200 transform active:scale-95 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {statusMessage === 'Updating...' ? 'Saving...' : 'Save Changes'}
                            </button>
                            {statusMessage && statusMessage !== 'Updating...' && (
                                <p className={`text-sm font-medium ${statusMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                                    {statusMessage}
                                </p>
                            )}
                        </div>
                    </form>
                </div>

                {/* --- SEÇÃO DE GERENCIAMENTO DE SEGUIDORES --- */}
                <div className="bg-black border border-gray-800 rounded-2xl p-8">
                    <h2 className="text-xl font-bold mb-4">Manage Followers</h2>
                    <p className="text-sm text-gray-500 mb-6">People following you. Removing a follower prevents them from seeing your private posts.</p>
                    
                    <div className="space-y-4">
                        {profile.followers.length > 0 ? (
                            profile.followers.map((follower) => (
                                <div key={follower.id} className="flex items-center justify-between p-3 bg-[#16181C] rounded-xl border border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <img src={follower.profile_picture || '/default-avatar.png'} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-800" />
                                        <div>
                                            <p className="text-sm font-bold text-white">{follower.display_name || follower.username}</p>
                                            <p className="text-xs text-gray-500">@{follower.username}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveFollower(follower.id)}
                                        className="text-xs font-bold text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 transition"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 border border-dashed border-gray-800 rounded-xl">
                                <p className="text-gray-500 text-sm">No followers yet.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProfilePage;