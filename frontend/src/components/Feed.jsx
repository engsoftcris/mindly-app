import React, { useEffect, useState, useRef, useCallback } from 'react';
import { postsAPI } from '../api/axios';
import { Link } from 'react-router-dom';
import CreatePost from '../components/CreatePost'; // Importamos o componente de input

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); 

  const loadingRef = useRef(false);

  const fetchFeed = useCallback(async (url = null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      let response;
      if (url) {
        response = await postsAPI.getFeed(url);
      } else {
        // 'all' = Recomendados (Geral) | 'following' = Apenas quem sigo
        const endpoint = activeTab === 'all' ? '/posts/' : '/accounts/feed/';
        response = await postsAPI.getFeed(endpoint);
      }

      setPosts(prev => (url ? [...prev, ...response.data.results] : response.data.results));
      setNextPage(response.data.next);
    } catch (err) {
      console.error("Failed to fetch feed", err);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setPosts([]); 
    setNextPage(null); 
    fetchFeed(); 
  }, [activeTab, fetchFeed]); 

  // Função para injetar o novo post no topo sem dar refresh
  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
  };

  const observer = useRef(null);
  const lastPostElementRef = useCallback((node) => {
    if (loadingRef.current) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && nextPage) {
        fetchFeed(nextPage);
      }
    });
    if (node) observer.current.observe(node);
  }, [nextPage, fetchFeed]);

  return (
    <div className="w-full min-h-screen bg-black">
      {/* --- HEADER COM ABAS --- */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="flex w-full">
          <button 
            onClick={() => setActiveTab('all')}
            className="flex-1 py-4 hover:bg-white/5 transition relative"
          >
            <span className={`text-sm font-bold ${activeTab === 'all' ? 'text-white' : 'text-gray-500'}`}>For You</span>
            {activeTab === 'all' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-[#1D9BF0] rounded-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('following')}
            className="flex-1 py-4 hover:bg-white/5 transition relative"
          >
            <span className={`text-sm font-bold ${activeTab === 'following' ? 'text-white' : 'text-gray-500'}`}>Following</span>
            {activeTab === 'following' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#1D9BF0] rounded-full"></div>}
          </button>
        </div>
      </div>

      {/* --- INPUT DE POSTAGEM (Sempre aberto como no Instagram/Twitter) --- */}
      <div className="border-b border-gray-800">
        <CreatePost onPostCreated={handlePostCreated} />
      </div>

      {/* --- FEED DE POSTS --- */}
      <div className="divide-y divide-gray-800">
        {posts.map((post, index) => {
          const isLast = posts.length === index + 1;
          return (
            <div
              key={post.id}
              ref={isLast ? lastPostElementRef : null}
              className="p-4 hover:bg-white/[0.02] transition cursor-pointer"
            >
              <div className="flex gap-3">
                <Link to={`/profile/${post.author?.id}`}>
                  <img 
                    src={post.author?.profile_picture || "/static/images/default-avatar.png"} 
                    className="w-12 h-12 rounded-full object-cover border border-gray-800" 
                    alt="avatar"
                  />
                </Link>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-1">
                   <Link 
  to={`/profile/${post.author?.id}`} 
  className="font-bold text-white hover:underline"
>
  {post.author?.display_name || post.author?.username}
</Link>
                    <span className="text-gray-500 text-sm">@{post.author?.username}</span>
                  </div>

                  <div className="text-[15px] text-gray-100 leading-normal break-words">
                    {post.content}
                  </div>
                  
                  {post.media_url && (
                    <img src={post.media_url} className="mt-3 rounded-2xl border border-gray-800 max-h-96 w-full object-cover" alt="post media" />
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="p-10 flex justify-center">
             <div className="animate-spin h-6 w-6 border-2 border-[#1D9BF0] border-t-transparent rounded-full"></div>
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="p-10 text-center text-gray-500">
            {activeTab === 'following' 
              ? "You're not following anyone yet, or they haven't posted." 
              : "No recommended posts found."}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;