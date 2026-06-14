// frontend/src/components/LikeButton.jsx
import React, { useState } from 'react';
import api from '../api/axios';
import { Heart } from 'lucide-react';

const LikeButton = ({ post, onLikeToggle }) => {
  const [loading, setLoading] = useState(false);

  const handleLike = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      const response = await api.post(`/posts/${post.id}/like/`);

      onLikeToggle(post.id, response.data.is_liked, response.data.likes_count);
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      data-cy="like-button"
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center gap-2 transition-colors group ${
        post.is_liked ? 'text-pink-500' : 'text-gray-500 hover:text-pink-500'
      }`}
    >
      <div
        className={`p-2 rounded-full group-hover:bg-pink-500/10 transition-colors`}
      >
        <Heart
          size={18}
          fill={post.is_liked ? 'currentColor' : 'none'}
          className={loading ? 'animate-pulse' : ''}
        />
      </div>
      <span data-cy="likes-count" className="text-xs font-medium">
        {post.likes_count || 0}
      </span>
    </button>
  );
};

export default LikeButton;
