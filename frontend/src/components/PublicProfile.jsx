import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';

const PublicProfile = () => {
    const { id } = useParams();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/accounts/profiles/${id}/`);
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

    if (loading) return (
        <div className="min-h-screen bg-[#0F1419] flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-[#1D9BF0] border-t-transparent rounded-full"></div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-[#0F1419] text-white flex items-center justify-center">
            <p className="text-gray-400">{error}</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#0F1419] text-white flex justify-center p-4">
            <div className="w-full max-w-xl bg-black border border-gray-800 rounded-2xl overflow-hidden h-fit">
                
                <div className="h-32 bg-gray-900"></div>

                <div className="p-6 relative">
                    <div className="absolute -top-12 left-6">
                        <img 
                            src={profile.profile_picture} 
                            alt={profile.username}
                            className="w-24 h-24 rounded-full border-4 border-black bg-black object-cover"
                        />
                    </div>

                    <div className="mt-14">
                        <h1 className="text-xl font-extrabold">{profile.display_name || profile.username}</h1>
                        <p className="text-gray-500">@{profile.username}</p>
                    </div>

                    <p className="mt-4 text-gray-200 whitespace-pre-wrap">{profile.bio || "No bio yet."}</p>

                    <div className="flex gap-4 mt-4 text-sm text-gray-500">
                        <span><strong className="text-white">0</strong> Following</span>
                        <span><strong className="text-white">0</strong> Followers</span>
                    </div>
                </div>

                {/* --- LÓGICA DE PRIVACIDADE --- */}
                <div className="border-t border-gray-800 mt-2">
                    {profile.is_restricted ? (
                        /* TELA TRANCADA (CADEADO) */
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="p-4 bg-gray-900 rounded-full mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold">These posts are protected</h2>
                            <p className="text-gray-500 mt-2 text-sm max-w-xs">
                                Only approved followers can see @{profile.username}'s posts. Click Follow to request access.
                            </p>
                            <button className="mt-6 bg-white text-black px-8 py-2 rounded-full font-bold hover:bg-gray-200 transition-all">
                                Follow
                            </button>
                        </div>
                    ) : (
                        /* LISTA DE POSTS COM TRAVA DE MODERAÇÃO */
                        <div className="divide-y divide-gray-800">
                            {profile.posts && profile.posts.length > 0 ? (
                                profile.posts.map(post => {
                                    const isVideo = post.media_url && /\.(mp4|webm|mov|mkv|avi)$/i.test(post.media_url);
                                    const isPending = post.moderation_status === "PENDING";
                                    const isRejected = post.moderation_status === "REJECTED";

                                    if (isRejected) return null; // Não mostra nada se for rejeitado

                                    return (
                                        <div key={post.id} className="p-4 hover:bg-white/[0.02] transition">
                                            <p className="text-gray-200 whitespace-pre-wrap">{post.content}</p>
                                            
                                            {post.media_url && (
                                                <div className="relative mt-3 overflow-hidden rounded-2xl border border-gray-800 bg-black">
                                                    {isVideo ? (
                                                        <video 
                                                            src={post.media_url} 
                                                            controls={!isPending} // Desativa controles se estiver em análise
                                                            className={`max-h-96 w-full object-cover ${isPending ? "blur-2xl opacity-40" : ""}`} 
                                                        />
                                                    ) : (
                                                        <img 
                                                            src={post.media_url} 
                                                            alt="Post content" 
                                                            className={`max-h-96 w-full object-cover ${isPending ? "blur-2xl opacity-40" : ""}`} 
                                                        />
                                                    )}

                                                    {/* Badge de "Em Análise" sobre o desfoque */}
                                                    {isPending && (
                                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                                                            <span className="bg-[#1D9BF0] text-white text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
                                                                Under Review
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            
                                            <span className="text-xs text-gray-600 mt-2 block">
                                                {new Date(post.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-12 text-center text-gray-500">
                                    This user hasn't posted anything yet.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PublicProfile;