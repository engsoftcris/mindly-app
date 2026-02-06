import React, { useEffect, useState, useRef, useCallback } from 'react';
import { postsAPI } from '../services/api';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [nextPage, setNextPage] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 1. Function to fetch data
  const fetchFeed = useCallback(async (url) => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await postsAPI.getFeed(url);
      // We APPEND the new posts to the existing ones
      setPosts(prev => [...prev, ...response.data.results]);
      setNextPage(response.data.next);
    } catch (err) {
      console.error("Failed to fetch feed", err);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // 2. Initial load
  useEffect(() => {
    fetchFeed();
  }, []);

  // 3. The "Magic Eye" (Observer)
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
  }, [loading, nextPage]);

  return (
    <div className="feed-container">
      {posts.map((post, index) => {
        // If it's the last post in the list, we attach the "Ref" to it
        if (posts.length === index + 1) {
          return <div ref={lastPostElementRef} key={post.id}>{post.content}</div>;
        }
        return <div key={post.id}>{post.content}</div>;
      })}
      
      {loading && <p>Loading more posts...</p>}
    </div>
  );
};

export default Feed;