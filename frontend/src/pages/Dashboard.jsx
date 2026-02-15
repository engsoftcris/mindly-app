import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { postsAPI } from "../api/axios";
import CreatePost from "../components/CreatePost";

const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' (Para você) ou 'following' (Seguindo)

  const loadingRef = useRef(false);

  const fetchFeed = useCallback(async (urlOrPage = null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      let response;
      // Se tivermos uma URL completa (paginação), usamos ela
      if (urlOrPage && typeof urlOrPage === 'string' && urlOrPage.includes('http')) {
        response = await postsAPI.getFeed(urlOrPage);
      } else {
        // Se for a primeira carga, escolhemos o endpoint com base na aba
        const endpoint = activeTab === 'all' ? "/posts/" : "/accounts/feed/";
        response = await postsAPI.getFeed(endpoint);
      }

      const newPosts = response.data.results || response.data;
      const nextUrl = response.data.next || null;

      // Se for paginação (scroll), adiciona aos existentes. Se for troca de aba, substitui.
      setPosts(prev => (urlOrPage ? [...prev, ...newPosts] : newPosts));
      setNextPage(nextUrl);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [activeTab]);

  // Recarrega o feed sempre que mudar a aba
  useEffect(() => {
    setPosts([]);
    setNextPage(null);
    fetchFeed();
  }, [activeTab, fetchFeed]);

  const handlePostCreated = (newPost) => {
    // Adiciona o novo post no topo apenas se estiver na aba "Para você"
    // ou se o usuário quiser ver o próprio post na aba Seguindo
    setPosts(prev => [newPost, ...prev]);
  };

  // Lógica de Scroll Infinito
  const observer = useRef();
  const lastPostElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && nextPage) {
        fetchFeed(nextPage);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, nextPage, fetchFeed]);

  return (
    <div className="w-full min-h-screen bg-black">
      {/* --- HEADER COM ABAS --- */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="flex w-full">
          <button 
            onClick={() => setActiveTab('all')}
            className="flex-1 py-4 hover:bg-white/5 transition relative"
          >
            <span className={`text-sm font-bold ${activeTab === 'all' ? 'text-white' : 'text-gray-500'}`}>Para você</span>
            {activeTab === 'all' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-blue-500 rounded-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('following')}
            className="flex-1 py-4 hover:bg-white/5 transition relative"
          >
            <span className={`text-sm font-bold ${activeTab === 'following' ? 'text-white' : 'text-gray-500'}`}>Seguindo</span>
            {activeTab === 'following' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-blue-500 rounded-full"></div>}
          </button>
        </div>
      </div>

      <CreatePost onPostCreated={handlePostCreated} />

      {/* --- LISTAGEM DE POSTS --- */}
      <div className="divide-y divide-gray-800">
        {posts.length > 0 ? (
          posts.map((post, index) => {
            const isLastElement = posts.length === index + 1;
            return (
              <div
                key={post.id}
                ref={isLastElement ? lastPostElementRef : null}
                className="p-4 hover:bg-white/[0.02] transition-colors flex gap-3"
              >
                {/* --- AVATAR --- */}
                <Link to={`/profile/${post.author?.uuid || post.author?.id}`} className="flex-shrink-0">
                  <img
                    src={post.author?.profile_picture || `https://ui-avatars.com/api/?name=${post.author?.username}&background=random`}
                    className="w-12 h-12 rounded-full object-cover border border-gray-800 hover:brightness-90 transition"
                    alt="avatar"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                    <Link 
                      to={`/profile/${post.author?.uuid || post.author?.id}`} 
                      className="font-bold text-white hover:underline cursor-pointer"
                    >
                      {post.author?.display_name || post.author?.username}
                    </Link>
                    <span className="text-gray-500 text-sm">@{post.author?.username}</span>
                  </div>

                  <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-[15px]">
                    {post.content}
                  </p>

                  {/* Renderização de Mídia */}
                  {(post.media_url || post.media) && (() => {
                    const mediaSrc = post.media_url || post.media;
                    const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(mediaSrc);
                    const isPending = post.moderation_status === "PENDING";
                    const isRejected = post.moderation_status === "REJECTED";

                    if (isRejected) return (
                      <div className="mt-3 p-4 rounded-xl border border-red-900/30 bg-red-900/10 text-center text-red-500 text-xs font-bold">
                        Conteúdo removido por violação das diretrizes.
                      </div>
                    );

                    return (
                      <div className="relative mt-3 overflow-hidden rounded-2xl border border-gray-800 bg-black">
                        {isVideo ? (
                          <video src={mediaSrc} controls={!isPending} className={`max-h-96 w-full object-cover ${isPending ? "blur-2xl opacity-40" : ""}`} />
                        ) : (
                          <img src={mediaSrc} className={`max-h-96 w-full object-cover ${isPending ? "blur-2xl opacity-40" : ""}`} alt="Post" />
                        )}
                        {isPending && (
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm text-blue-400 font-bold text-xs uppercase p-2">
                            Conteúdo em Análise
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  
                  <div className="mt-3 text-[11px] text-gray-600">
                    {new Date(post.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          /* --- ESTADO VAZIO (MENSAGEM DE INCENTIVO) --- */
          !loading && (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              {activeTab === 'following' ? (
                <div className="max-w-sm">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-full mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white mb-2">Focus on your circle</h2>
                  <p className="text-gray-500 mb-6">
                    When you follow people, their posts will show up here. Start by finding some interesting accounts!
                  </p>
                  <button 
                    onClick={() => setActiveTab('all')}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-full transition-all transform active:scale-95"
                  >
                    Find people to follow
                  </button>
                </div>
              ) : (
                <p className="text-gray-500 font-medium">No posts to show right now.</p>
              )}
            </div>
          )
        )}
      </div>

      {loading && (
        <div className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;