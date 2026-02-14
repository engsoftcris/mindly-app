import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { postsAPI } from "../api/axios";
import CreatePostModal from "../components/CreatePostModal";

const Dashboard = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchFeed = useCallback(async (urlOrPage = "/accounts/feed/") => {
    if (loading || !urlOrPage) return;
    setLoading(true);
    try {
      const response = await postsAPI.getFeed(urlOrPage);
      const newPosts = response.data.results || response.data; 
      const nextUrl = response.data.next || null;
      setPosts(prev => urlOrPage !== "/accounts/feed/" ? [...prev, ...newPosts] : newPosts);
      setNextPage(nextUrl);
    } catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchFeed("/accounts/feed/");
  }, []);

  const handleRefresh = async () => {
  setNextPage(null);
  await fetchFeed("/accounts/feed/");
};

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
    // FONTE DE COR E FUNDO ALTERADOS PARA O TEMA DARK #0F1419
    <div className="min-h-screen bg-[#0F1419] text-white">
      <div className="max-w-4xl mx-auto p-6 bg-[#0F1419]">
        
        {/* --- HEADER SECTION --- */}
        <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-6">
          <div className="flex items-center space-x-4">
            <img
              src={user?.profile_picture || `https://ui-avatars.com/api/?name=${user?.display_name || user?.username || 'User'}&background=0D8ABC&color=fff`}
              alt="Profile"
              className="w-16 h-16 rounded-full border-2 border-blue-500 object-cover"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">Seu Mundo Mindly</h1>
              <p className="text-gray-400 text-sm italic">Onde as ideias fluem...</p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-all"
          >
            + New Post
          </button>
        </div>

        {/* --- FEED SECTION --- */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold border-l-4 border-blue-500 pl-3 mb-6">Network Feed</h2>

          {posts.map((post, index) => {
            const isLastElement = posts.length === index + 1;
            return (
              <div
                key={post.id}
                ref={isLastElement ? lastPostElementRef : null}
                className="p-5 bg-[#161b22] rounded-xl border border-gray-800 hover:border-gray-700 transition-colors shadow-sm"
              >
                {/* Author Info */}
                <div className="flex items-center space-x-3 mb-4">
                  <img
                    src={post.author?.profile_picture || `https://ui-avatars.com/api/?name=${post.author?.username || 'User'}&background=random`}
                    alt="Author"
                    className="w-10 h-10 rounded-full border border-gray-700"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-sm text-white">
                      {post.author?.display_name || post.author?.username}
                    </span>
                    <span className="text-gray-500 text-xs">@{post.author?.username}</span>
                  </div>
                </div>

                <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{post.content}</p>

             {/* --- CÓDIGO ATUALIZADO DENTRO DO MAP --- */}
{
  (post.media_url || post.media) && (() => {
    const mediaSrc = post.media_url || post.media;
    const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(mediaSrc);
    
    const isPending = post.moderation_status === "PENDING";
    const isRejected = post.moderation_status === "REJECTED";

    // 1. CASO REJEITADO: Mostra apenas o aviso de diretrizes
    if (isRejected) {
      return (
        <div className="mt-3 p-6 rounded-xl border border-red-900/30 bg-red-900/10 flex flex-col items-center justify-center text-center">
          <svg className="w-8 h-8 text-red-500/60 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-red-500 font-bold text-xs uppercase tracking-widest">Conteúdo Removido</p>
          <p className="text-gray-500 text-[10px] mt-1 italic">Este post violou as diretrizes da comunidade e não está mais disponível.</p>
        </div>
      );
    }

    // 2. CASO PENDENTE OU APROVADO: Mostra a mídia (com ou sem blur)
    return (
      <div className="relative mt-3 overflow-hidden rounded-xl border border-gray-800 bg-[#0d1117] group">
        {isVideo ? (
          <video
            src={mediaSrc}
            controls={!isPending}
            playsInline
            className={`max-h-96 w-full object-contain transition-all duration-500 ${isPending ? "blur-2xl scale-110 opacity-40" : ""}`}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <img
            src={mediaSrc}
            alt="Post media"
            className={`max-h-96 w-full object-contain transition-all duration-500 ${isPending ? "blur-2xl scale-110 opacity-40" : ""}`}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        )}

        {/* Overlay para PENDING */}
        {isPending && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <div className="bg-blue-500/20 backdrop-blur-md border border-blue-500/50 p-3 rounded-2xl shadow-2xl">
              <svg className="w-8 h-8 text-blue-400 mx-auto mb-2 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <p className="text-blue-400 font-bold text-xs uppercase tracking-tighter">Conteúdo em Análise</p>
              <p className="text-gray-300 text-[10px] mt-1 max-w-[150px]">Ficará visível para a rede após aprovação.</p>
            </div>
          </div>
        )}
      </div>
    );
  })()
}
                <div className="mt-4 text-[10px] text-gray-600 uppercase tracking-widest font-semibold">
                  {new Date(post.created_at).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>

        {loading && (
          <div className="flex justify-center mt-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {!nextPage && posts.length > 0 && (
          <p className="text-center mt-10 text-gray-600 text-sm">✨ Você chegou ao fim do mundo!</p>
        )}
      </div>

      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        refreshPosts={handleRefresh}
      />
    </div>
  );
};

export default Dashboard;