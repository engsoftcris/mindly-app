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

  const handleRefresh = () => {
    setPosts([]);
    fetchFeed();
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

                {post.media && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-gray-800 bg-black">
                    {post.media.match(/\.(mp4|webm|mov|ogg)$/i) ? (
                      <video src={post.media} controls className="w-full max-h-[500px]" />
                    ) : (
                      <img src={post.media} className="w-full max-h-[500px] object-cover" alt="media" />
                    )}
                  </div>
                )}

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