import React, { useEffect, useState, useRef, useCallback } from 'react';
import { postsAPI } from '../services/api';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const fetchFeed = useCallback(async (url) => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await postsAPI.getFeed(url);
      setPosts(prev => [...prev, ...response.data.results]);
      setNextPage(response.data.next);
    } catch (err) {
      console.error("Failed to fetch feed", err);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]); // Adicionado fetchFeed como dependência (boa prática)

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
    <div className="feed-container space-y-4 p-4">
      {posts.map((post, index) => {
        const isLast = posts.length === index + 1;
        
        return (
          <div 
            key={post.id} 
            ref={isLast ? lastPostElementRef : null}
            className="p-4 bg-white border rounded-lg shadow-sm"
          >
            {/* --- CABEÇALHO DO POST --- */}
            <div className="flex items-center mb-2">
              <span className="font-bold text-blue-600 mr-2">
                {/* A MÁGICA AQUI: 
                  Verifique se o seu backend envia 'author' ou 'author_details'. 
                  Pelo que vimos antes, deve ser post.author.display_name 
                */}
                {post.author?.display_name || post.author?.username || "Usuário"}
              </span>
              <span className="text-gray-400 text-xs">
                @{post.author?.username}
              </span>
            </div>

            {/* --- CONTEÚDO --- */}
            <div className="text-gray-800">
              {post.content}
            </div>
          </div>
        );
      })}
      
      {loading && <p className="text-center text-blue-500">Loading more posts...</p>}
    </div>
  );
};

export default Feed;