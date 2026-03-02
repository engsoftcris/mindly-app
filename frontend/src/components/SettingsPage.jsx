import React, { useState, useEffect } from 'react';
import api from '../api/axios'; 
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BlockedUsersList from './BlockedUsersList'; 
import ProfilePhotoEditor from './ProfilePhotoEditor'; // Importando o novo componente

const SettingsPage = () => {
    const { user, updateUser } = useAuth(); // Pegando 'user' do contexto para a foto atual
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('profile'); 
    const [selectedFile, setSelectedFile] = useState(null); // Estado para o novo arquivo

    const [settings, setSettings] = useState({
        display_name: '',
        bio: '',
        username: '',
        email: '',
        is_private: false,
    });

    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        const fetchSettingsData = async () => {
            try {
                const response = await api.get('/accounts/profile/');
                setSettings({
                    display_name: response.data.display_name || response.data.full_name || '',
                    bio: response.data.bio || '',
                    username: response.data.username || '',
                    email: response.data.email || '',
                    is_private: response.data.is_private || false,
                });
                setLoading(false);
            } catch (error) {
                setLoading(false);
            }
        };
        fetchSettingsData();
    }, []);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setStatusMessage('Updating...');
        
        try {
            // ✅ Mudança para FormData para suportar o envio da imagem
            const formData = new FormData();
            formData.append('display_name', settings.display_name);
            formData.append('bio', settings.bio);
            formData.append('is_private', settings.is_private);
            
            if (selectedFile) {
                formData.append('upload_picture', selectedFile);
            }

            const response = await api.patch('/accounts/profile/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            // Atualiza o contexto global com os dados retornados do servidor
            updateUser(response.data);

            setStatusMessage('Settings updated successfully! ✅');
            setSelectedFile(null); // Limpa o arquivo selecionado
            setTimeout(() => setStatusMessage(''), 3000);
        } catch (error) {
            console.error(error);
            setStatusMessage('Failed to update settings. ❌');
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
                
                {/* Header com Navegação */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                        <button 
                            data-cy="settings-back-button"
                            onClick={() => activeTab === 'blocked' ? setActiveTab('profile') : navigate(-1)}
                            className="p-2 hover:bg-white/10 rounded-full transition"
                        >
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                                <path d="M7.414 13l5.086 5.086-1.414 1.414L3.172 11.586l7.914-7.914 1.414 1.414L7.414 11H21v2H7.414z"/>
                            </svg>
                        </button>
                        <h1 className="text-xl font-bold">
                            {activeTab === 'profile' ? 'Settings' : 'Blocked Users'}
                        </h1>
                    </div>

                    {activeTab === 'profile' && (
                        <button 
                            data-cy="settings-view-blocked"
                            onClick={() => setActiveTab('blocked')}
                            className="text-xs text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
                        >
                            <span className="text-lg">🚫</span> Manage Blocked
                        </button>
                    )}
                </div>

                {activeTab === 'profile' ? (
                    <div className="bg-black border border-gray-800 rounded-2xl p-8 h-fit shadow-2xl">
                        <form onSubmit={handleUpdate} className="space-y-6">
                            
                            {/* ✅ COMPONENTE DE FOTO ADICIONADO AQUI */}
                            <ProfilePhotoEditor 
                                currentImage={user?.profile_picture} 
                                onFileSelect={(file) => setSelectedFile(file)}
                            />

                            <div>
                                <label className="block text-gray-500 text-sm mb-1">Username</label>
                                <input 
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
                                    className="w-full bg-[#16181C] text-white p-3 rounded-lg border border-gray-800 focus:border-[#1D9BF0] outline-none h-32 resize-none transition"
                                    value={settings.bio}
                                    onChange={(e) => setSettings({...settings, bio: e.target.value})}
                                />
                            </div>

                            {/* Privacy Toggle */}
                            <div className="flex items-center justify-between p-4 bg-[#16181C] rounded-xl border border-gray-800 hover:border-gray-700 transition-all">
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
                                    className={`${settings.is_private ? 'bg-indigo-600' : 'bg-gray-700'} relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors duration-200`}
                                >
                                    <span className={`${settings.is_private ? 'translate-x-5' : 'translate-x-0'} inline-block h-5 w-5 transform rounded-full bg-white transition duration-200`} />
                                </button>
                            </div>

                            <div className="flex flex-col items-center gap-4 pt-4">
                                <button 
                                    data-cy="settings-submit-button"
                                    type="submit"
                                    disabled={statusMessage === 'Updating...'}
                                    className="w-56 bg-[#1D9BF0] hover:bg-[#1A8CD8] text-white font-bold py-2.5 rounded-full transition-all disabled:opacity-50 shadow-lg"
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
                ) : (
                    <div className="bg-black border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                        <BlockedUsersList />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;