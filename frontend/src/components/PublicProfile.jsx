import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import FollowButton from '../components/FollowButton';
import UserActionMenu from '../components/UserActionMenu';
import LoadingScreen from "./LoadingScreen";
import ConnectionsModal from '../components/ConnectionsModal';

const PublicProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); 
    const { user: currentUser } = useAuth();
    const [connModal, setConnModal] = useState({ open: false, tab: 'followers' });

    useEffect(() => {
        const fetchProfile = async () => {
            // Adicionado o tempo mínimo de 800ms
            const minWait = new Promise(resolve => setTimeout(resolve, 800));

            try {
                setLoading(true);
                // Espera a API e o timer ao mesmo tempo
                const [response] = await Promise.all([
                    api.get(`/accounts/profiles/${id}/`),
                    minWait
                ]);
                setProfile(response.data);
                setLoading(false);
            } catch (err) {
                console.error("Erro ao carregar perfil:", err);
                setError(err.response?.status === 404 ? "User not found" : "Error loading profile");
                setLoading(false);
            }
        };
        if (id) fetchProfile();
    }, [id]);

    // Lógica original de filtros preservada
    const photos = profile?.posts?.filter(p => 
        p.media_url && !/\.(mp4|webm|mov|mkv|avi)$/i.test(p.media_url) && p.moderation_status !== "REJECTED"
    ) || [];

    const videos = profile?.posts?.filter(p => 
        p.media_url && /\.(mp4|webm|mov|mkv|avi)$/i.test(p.media_url) && p.moderation_status !== "REJECTED"
    ) || [];

    // Trocado o spinner antigo pela LoadingScreen
    if (loading) return <LoadingScreen />;

    if (error) return (
        <div className="min-h-screen bg-[#0F1419] text-white flex items-center justify-center font-bold">{error}</div>
    );

    // Lógica do isOwner
    const isOwner = profile && currentUser && String(currentUser.id) === String(profile.id);

    return (
        <div className="min-h-screen bg-[#0F1419] text-white flex justify-center p-4">
            <div className="w-full max-w-xl bg-black border border-gray-800 rounded-2xl overflow-hidden h-fit">
                
                <div className="h-32 bg-gray-900"></div>
                <div className="p-6 relative border-b border-gray-800">
                    <div className="absolute -top-12 left-6">
                        <img src={profile.profile_picture} className="w-24 h-24 rounded-full border-4 border-black bg-black object-cover" alt="" />
                    </div>
                    
                    <div className="flex justify-end mb-2">
                        <div className="flex justify-end items-center gap-2 mb-2">
                            {isOwner ? (
                                <button 
                                    onClick={() => navigate('/settings')}
                                    className="px-4 py-1.5 rounded-full border border-gray-600 text-white font-bold text-[15px] hover:bg-white/10 transition"
                                >
                                    Edit Profile
                                </button>
                            ) : (
                                <>
                                    {profile && currentUser && (
                                        <UserActionMenu 
                                            targetProfile={profile} 
                                        />
                                    )}

                                    {profile && currentUser && (
                                        <FollowButton 
                                            profileId={profile.id} 
                                            initialIsFollowing={profile.is_following} 
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-14">
                        <h1 className="text-xl font-extrabold">{profile.display_name || profile.username}</h1>
                        <p className="text-gray-500">@{profile.username}</p>
                    </div>
                    <p className="mt-4 text-gray-200 whitespace-pre-wrap">{profile.bio || "No bio yet."}</p>

                    <div className="mt-4 flex gap-5 text-[15px]">
                        <div onClick={() => setConnModal({ open: true, tab: 'following' })} className="flex gap-1 hover:underline cursor-pointer decoration-gray-500">
                            <span className="font-bold text-white">
                                {profile.following_count || 0}
                            </span>
                            <span className="text-gray-500">Following</span>
                        </div>
                        <div onClick={() => setConnModal({ open: true, tab: 'followers' })} className="flex gap-1 hover:underline cursor-pointer decoration-gray-500">
                            <span className="font-bold text-white">
                                {profile.followers_count || 0}
                            </span>
                            <span className="text-gray-500">Followers</span>
                        </div>
                    </div>
                </div>

                {/* TABS E RESTO DO CÓDIGO EXATAMENTE IGUAL AO SEU */}
                <div className="flex border-b border-gray-800 sticky top-0 bg-black/80 backdrop-blur-md z-10">
                    {['all', 'photos', 'videos'].map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className="flex-1 py-4 hover:bg-white/5 transition relative capitalize">
                            <span className={`text-sm font-bold ${activeTab === tab ? "text-white" : "text-gray-500"}`}>
                                {tab === 'all' ? 'Posts' : tab}
                            </span>
                            {activeTab === tab && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-[#1D9BF0] rounded-full" />}
                        </button>
                    ))}
                </div>

                <div>
                    {profile.is_restricted ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
                             <h2 className="text-xl font-bold text-white">These posts are protected</h2>
                        </div>
                    ) : (
                        <div className="min-h-[300px]">
                            {activeTab === 'all' && (
                                <div className="divide-y divide-gray-800">
                                    {profile.posts?.length > 0 ? profile.posts.map(post => {
                                        if (post.moderation_status === "REJECTED") return null;
                                        const isVideo = post.media_url && /\.(mp4|webm|mov|mkv|avi)$/i.test(post.media_url);
                                        const isPending = post.moderation_status === "PENDING";

                                        return (
                                            <div key={post.id} className="p-4 hover:bg-white/[0.01]" data-cy="post-card">
                                                <p className="text-[15px] text-gray-200 mb-3">{post.content}</p>
                                                {post.media_url && (
                                                    <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-black">
                                                        {isVideo ? (
                                                            <video src={post.media_url} controls={!isPending} className={`max-h-[450px] w-full object-cover ${isPending ? "blur-2xl opacity-40" : ""}`} />
                                                        ) : (
                                                            <img src={post.media_url} className={`max-h-[450px] w-full object-cover ${isPending ? "blur-2xl opacity-40" : ""}`} alt="" />
                                                        )}
                                                        {isPending && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                                                <span className="bg-[#1D9BF0] text-white text-[10px] font-bold px-2 py-1 rounded uppercase">Under Review</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <span className="text-xs text-gray-600 mt-3 block">{new Date(post.created_at).toLocaleDateString()}</span>
                                            </div>
                                        );
                                    }) : <div className="p-20 text-center text-gray-500">No posts yet.</div>}
                                </div>
                            )}

                            {activeTab !== 'all' && (
                                <div className="grid grid-cols-3 gap-1 p-1">
                                    {(activeTab === 'photos' ? photos : videos).length > 0 ? (activeTab === 'photos' ? photos : videos).map(post => {
                                        const isPending = post.moderation_status === "PENDING";
                                        const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(post.media_url);

                                        return (
                                            <div key={post.id} className="relative aspect-square bg-gray-900 overflow-hidden group cursor-pointer">
                                                {isVideo ? (
                                                    <video src={post.media_url} className={`w-full h-full object-cover ${isPending ? "blur-2xl opacity-30" : ""}`} />
                                                ) : (
                                                    <img src={post.media_url} className={`w-full h-full object-cover ${isPending ? "blur-2xl opacity-30" : ""}`} alt="" />
                                                )}
                                                {isVideo && !isPending && (
                                                    <div className="absolute top-2 right-2 bg-black/60 p-1 rounded-md">
                                                        <svg viewBox="0 0 24 24" className="w-3 h-3 text-white fill-current"><path d="M8 5v14l11-7z"/></svg>
                                                    </div>
                                                )}
                                                {isPending && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-[9px] bg-[#1D9BF0] text-white font-bold px-1 py-0.5 rounded opacity-90 uppercase">Review</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }) : <div className="col-span-3 p-20 text-center text-gray-500">No media found.</div>}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <ConnectionsModal 
                isOpen={connModal.open} 
                onClose={() => setConnModal({ ...connModal, open: false })} 
                profileId={profile.id} 
                initialTab={connModal.tab} 
            />
        </div>
    );
};

export default PublicProfile;