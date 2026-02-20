import React, { useState, useEffect } from 'react';
import api from '../api/axios'; 
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
    const { updateUser, user: currentUser } = useAuth(); 
    const navigate = useNavigate();

    const [settings, setSettings] = useState({
        display_name: '',
        bio: '',
        username: '',
        email: '',
        is_private: false,
        followers: [] 
    });

    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        const fetchSettingsData = async () => {
            try {
                // Endpoint 'me' para garantir que estamos pegando os dados do próprio user
                const response = await api.get('/accounts/profile/me/');
                setSettings({
                    display_name: response.data.display_name || response.data.full_name || '',
                    bio: response.data.bio || '',
                    username: response.data.username || '',
                    email: response.data.email || '',
                    is_private: response.data.is_private || false,
                    followers: response.data.followers || [] 
                });
                setLoading(false);
            } catch (error) {
                console.error("Error fetching settings:", error);
                setLoading(false);
            }
        };
        fetchSettingsData();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setStatusMessage('Updating...');
        try {
            const response = await api.patch('/accounts/profile/me/', {
                display_name: settings.display_name,
                bio: settings.bio,
                is_private: settings.is_private
            });

            updateUser({ 
                display_name: response.data.display_name,
                bio: response.data.bio, 
                profile_picture: response.data.profile_picture,
                is_private: response.data.is_private
            });

            setStatusMessage('Settings updated successfully! ✅');
            setTimeout(() => setStatusMessage(''), 3000);
        } catch (error) {
            setStatusMessage('Failed to update settings. ❌');
        }
    };

    const handleRemoveFollower = async (followerId) => {
        if (!window.confirm("Are you sure you want to remove this follower?")) return;

        try {
            await api.delete(`/accounts/followers/${followerId}/remove/`);
            
            setSettings({
                ...settings,
                followers: settings.followers.filter(f => f.id !== followerId)
            });
        } catch (error) {
            console.error("Failed to remove follower:", error);
            alert("Error removing follower.");
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0F1419] flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-[#1D9BF0] border-t-transparent rounded-full"></div>
        </div>
    );
return (
        <div className="min-h-screen bg-[#0F1419] text-white flex justify-center p-6">
            <div className="w-full max-w-xl space-y-6">
                
                <div className="flex items-center gap-4 mb-2">
                    <button 
                        data-cy="settings-back-button"
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-white/10 rounded-full transition"
                    >
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M7.414 13l5.086 5.086-1.414 1.414L3.172 11.586l7.914-7.914 1.414 1.414L7.414 11H21v2H7.414z"/></svg>
                    </button>
                    <h1 className="text-xl font-bold">Settings</h1>
                </div>

                <div className="bg-black border border-gray-800 rounded-2xl p-8 h-fit">
                    <form onSubmit={handleUpdate} className="space-y-6">
                        <div>
                            <label className="block text-gray-500 text-sm mb-1">Username</label>
                            <input 
                                data-cy="settings-input-username"
                                type="text" 
                                value={settings.username} 
                                disabled 
                                className="w-full bg-transparent border-b border-gray-800 py-2 opacity-50 cursor-not-allowed outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Display Name</label>
                            <input 
                                data-cy="settings-input-display-name"
                                type="text"
                                maxLength={50}
                                className="w-full bg-[#16181C] text-white p-3 rounded-lg border border-gray-800 focus:border-[#1D9BF0] outline-none transition"
                                value={settings.display_name}
                                onChange={(e) => setSettings({...settings, display_name: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-gray-400 text-sm mb-1 flex justify-between">
                                <span>Bio</span>
                                <span className="text-xs text-gray-600">{settings.bio.length}/160</span>
                            </label>
                            <textarea 
                                data-cy="settings-input-bio"
                                maxLength={160}
                                className="w-full bg-[#16181C] text-white p-3 rounded-lg border border-gray-800 focus:border-[#1D9BF0] outline-none h-32 resize-none transition"
                                value={settings.bio}
                                onChange={(e) => setSettings({...settings, bio: e.target.value})}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-[#16181C] rounded-xl border border-gray-800 group transition-all duration-200 hover:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${settings.is_private ? 'bg-indigo-500/10 text-indigo-400' : 'bg-gray-800 text-gray-500'}`}>
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
                                data-cy="settings-privacy-toggle"
                                type="button"
                                onClick={() => setSettings({ ...settings, is_private: !settings.is_private })}
                                className={`${
                                    settings.is_private ? 'bg-indigo-600' : 'bg-gray-700'
                                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
                            >
                                <span className={`${settings.is_private ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                            </button>
                        </div>

                        <div className="flex flex-col items-center gap-4 pt-4">
                            <button 
                                data-cy="settings-submit-button"
                                type="submit"
                                disabled={statusMessage === 'Updating...'}
                                className="w-56 bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white font-bold py-2.5 rounded-full transition-all duration-200 shadow-lg disabled:opacity-50"
                            >
                                {statusMessage === 'Updating...' ? 'Saving...' : 'Save Changes'}
                            </button>
                            {statusMessage && statusMessage !== 'Updating...' && (
                                <p data-cy="settings-status-message" className={`text-sm font-medium ${statusMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                                    {statusMessage}
                                </p>
                            )}
                        </div>
                    </form>
                </div>

                <div className="bg-black border border-gray-800 rounded-2xl p-8">
                    <h2 className="text-xl font-bold mb-4">Manage Followers</h2>
                    <div className="space-y-4" data-cy="settings-followers-list">
                        {settings.followers.length > 0 ? (
                            settings.followers.map((follower) => (
                                <div key={follower.id} data-cy={`follower-item-${follower.id}`} className="flex items-center justify-between p-3 bg-[#16181C] rounded-xl border border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <img src={follower.profile_picture || '/default-avatar.png'} alt="" className="w-10 h-10 rounded-full object-cover" />
                                        <div>
                                            <p className="text-sm font-bold">{follower.display_name || follower.username}</p>
                                            <p className="text-xs text-gray-500">@{follower.username}</p>
                                        </div>
                                    </div>
                                    <button 
                                        data-cy="remove-follower-button"
                                        onClick={() => handleRemoveFollower(follower.id)}
                                        className="text-xs font-bold text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div data-cy="no-followers-message" className="text-center py-10 border border-dashed border-gray-800 rounded-xl">
                                <p className="text-gray-500 text-sm">No followers yet.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SettingsPage;