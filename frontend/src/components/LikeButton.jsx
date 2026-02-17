// frontend/src/components/LikeButton.jsx
import React, { useState } from 'react';
import api from '../api/axios'; // Adjust based on your axios config path
import { Heart } from 'lucide-react'; // Or your preferred icon library

const LikeButton = ({ post, onLikeToggle }) => {
  const [loading, setLoading] = useState(false);

  const handleLike = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      // Endpoint matched with backend: /api/posts/{id}/like/
      const response = await api.post(`/posts/${post.id}/like/`);
      
      // Notify parent to update the posts list
      onLikeToggle(post.id, response.data.is_liked, response.data.likes_count);
    } catch (error) {
      console.error("Error toggling like:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center gap-2 transition-colors group ${
        post.is_liked ? "text-pink-500" : "text-gray-500 hover:text-pink-500"
      }`}
    >
      <div className={`p-2 rounded-full group-hover:bg-pink-500/10 transition-colors`}>
        <Heart 
          size={18} 
          fill={post.is_liked ? "currentColor" : "none"} 
          className={loading ? "animate-pulse" : ""}
        />
      </div>
      <span className="text-xs font-medium">{post.likes_count || 0}</span>
    </button>
  );
};

export default LikeButton;