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
        is_private: false // 1. Novo campo no estado
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
                    is_private: response.data.is_private || false // 2. Carrega do banco
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
                is_private: profile.is_private // 3. Envia para o backend
            });

            updateUser({ 
                display_name: response.data.display_name,
                bio: response.data.bio, 
                profile_picture: response.data.profile_picture,
                is_private: response.data.is_private // Atualiza o contexto global
            });

            setStatusMessage('Profile updated successfully! ✅');
        } catch (error) {
            setStatusMessage('Failed to update profile. ❌');
        }
    };

    if (loading) return <div className="text-white p-10 bg-[#0F1419] min-h-screen">Loading profile...</div>;

    return (
        <div className="min-h-screen bg-[#0F1419] text-white flex justify-center p-6">
            <div className="w-full max-w-xl bg-black border border-gray-800 rounded-2xl p-8 h-fit">
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
                            placeholder="Your name"
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
                            placeholder="What's on your mind?"
                            className="w-full bg-[#16181C] text-white p-3 rounded-lg border border-gray-800 focus:border-[#1D9BF0] outline-none h-32 resize-none transition"
                            value={profile.bio}
                            onChange={(e) => setProfile({...profile, bio: e.target.value})}
                        />
                    </div>

                    {/* --- NOVO: Privacy Switch --- */}
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
                            <span
                                className={`${
                                    profile.is_private ? 'translate-x-5' : 'translate-x-0'
                                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                            />
                        </button>
                    </div>
                    {/* --- FIM DO PRIVACY SWITCH --- */}

                    {/* Botão Centralizado e Mensagem de Status */}
                    <div className="flex flex-col items-center gap-4 pt-4">
                        <button 
                            type="submit"
                            disabled={statusMessage === 'Updating...'}
                            className="w-56 bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white font-bold py-2.5 rounded-full transition-all duration-200 transform active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {statusMessage === 'Updating...' ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : 'Save Changes'}
                        </button>

                        {statusMessage && statusMessage !== 'Updating...' && (
                            <p className={`text-sm font-medium animate-pulse ${statusMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                                {statusMessage}
                            </p>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;