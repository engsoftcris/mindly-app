import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { postsAPI } from "../api/axios"; // Double check this path!
import CreatePostModal from "../components/CreatePostModal";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // INFINITE SCROLL STATE
  const [posts, setPosts] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(false);

  // 1. Logic to fetch the Hybrid Feed
  const fetchFeed = useCallback(async (urlOrPage = "/accounts/feed/") => {
    console.log("🚀 Fetching feed from:", urlOrPage);
    if (loading || !urlOrPage) return;
    setLoading(true);
   try {
      const response = await postsAPI.getFeed(urlOrPage);
      console.log("✅ API Response:", response.data); // ADD THIS LINE
      
      // If response.data.results is undefined, your backend isn't paginating!
      const newPosts = response.data.results || response.data; 
      const nextUrl = response.data.next || null;

      setPosts(prev => urlOrPage !== "/accounts/feed/" ? [...prev, ...newPosts] : newPosts);
      setNextPage(nextUrl);
    }catch (error) {
      console.error("Error fetching feed:", error);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // 2. Initial Load
  useEffect(() => {
    fetchFeed("/accounts/feed/");
  }, []);

  // 3. Reset feed after a new post is created
  const handleRefresh = () => {
    setPosts([]);
    fetchFeed();
  };

  // 4. Intersection Observer Logic
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
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-md">
      {/* --- HEADER SECTION (Profile & Stats) --- */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <img
            src={user?.profile_picture || "https://via.placeholder.com/150"}
            alt="Profile"
            className="w-20 h-20 rounded-full border-2 border-blue-500 object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Hello, {user?.full_name || user?.username}!
            </h1>
            <p className="text-gray-500 text-sm">Mindly Social Feed</p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all"
        >
          + New Post
        </button>
      </div>

      {/* --- FEED SECTION --- */}
      <div className="mt-10 border-t pt-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Network Feed</h2>

        <div className="space-y-6">
          {posts.map((post, index) => {
            const isLastElement = posts.length === index + 1;
            return (
              <div
                key={post.id}
                ref={isLastElement ? lastPostElementRef : null}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm"
              >
                {/* Author Info */}
                <div className="flex items-center space-x-2 mb-3">
                    <img 
                        src={post.author?.profile_picture || "https://via.placeholder.com/150"} 
                        className="w-8 h-8 rounded-full border" 
                        alt="author"
                    />
                    <span className="font-bold text-sm text-gray-700">{post.author?.username}</span>
                </div>

                <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>

                {post.media && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 bg-black">
                    {post.media.match(/\.(mp4|webm|mov|ogg)$/i) ? (
                      <video src={post.media} controls className="w-full max-h-96" />
                    ) : (
                      <img src={post.media} className="w-full max-h-96 object-cover" alt="media" />
                    )}
                  </div>
                )}

                <div className="mt-3 flex justify-between items-center text-xs text-gray-400">
                  <span>{new Date(post.created_at).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>

        {loading && <p className="text-center mt-4 text-blue-500 font-medium animate-pulse">Loading more posts...</p>}
        
        {!nextPage && posts.length > 0 && (
          <p className="text-center mt-6 text-gray-400 text-sm">✨ You've reached the end of the world!</p>
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