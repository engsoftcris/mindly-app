import React, { useState, useEffect, useRef, useCallback } from "react";
import { postsAPI } from "../api/axios";
import { useAuth } from "../context/AuthContext";
import CreatePost from "../components/CreatePost";
import Feed from '../components/Feed';
import LoadingScreen from "../components/LoadingScreen";

const Dashboard = () => {
  const [posts, setPosts] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); 
  const { user: currentUser } = useAuth();

  const loadingRef = useRef(false);

  const fetchFeed = useCallback(async (urlOrPage = null) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    const minWait = new Promise(resolve => setTimeout(resolve, 800));

    try {
      let response;
      if (urlOrPage && typeof urlOrPage === 'string' && urlOrPage.includes('http')) {
        response = await postsAPI.getFeed(urlOrPage);
      } else {
        const endpoint = activeTab === 'all' ? "/posts/" : "/accounts/feed/";
        response = await postsAPI.getFeed(endpoint);
      }
      await minWait;
      const newPosts = response.data.results || response.data;
      setPosts(prev => (urlOrPage ? [...prev, ...newPosts] : newPosts));
      setNextPage(response.data.next || null);
    } catch (error) {
      console.error("Error fetching feed:", error);
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

  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
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
   
  if (loading && posts.length === 0) {
    return <LoadingScreen />;
  }
  return (
    <div className="w-full min-h-screen bg-black">
      {/* HEADER TABS */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="flex w-full">
          {['all', 'following'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-4 hover:bg-white/5 transition relative"
            >
              <span className={`text-sm font-bold ${activeTab === tab ? 'text-white' : 'text-gray-500'}`}>
                {tab === 'all' ? 'Para você' : 'Seguindo'}
              </span>
              {activeTab === tab && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-blue-500 rounded-full"></div>}
            </button>
          ))}
        </div>
      </div>

      <CreatePost onPostCreated={handlePostCreated} />

      {/* CHAMADA DO FEED COM TODA A LÓGICA PRESERVADA */}
      {posts.length > 0 ? (
        <Feed 
          posts={posts} 
          currentUser={currentUser} 
          setPosts={setPosts} 
          lastPostElementRef={lastPostElementRef}
        />
      ) : (
        !loading && (
          <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
            No posts to show right now.
          </div>
        )
      )}

      {loading && (
        <div className="p-8 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;