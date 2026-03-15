import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PostCard from './PostCard';
import CommentModal from './CommentModal';

const Feed = ({ posts, currentUser, setPosts, lastPostElementRef }) => {
  const [activePostForComment, setActivePostForComment] = useState(null);

  const location = useLocation();
  const highlightRef = useRef(null);
  const queryParams = new URLSearchParams(location.search);
  const highlightId = queryParams.get('highlight');

  useEffect(() => {
    if (highlightId && posts.length > 0 && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300);
    }
  }, [posts, highlightId]);

  const handleLikeUpdate = (postId, isLiked, likesCount) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, is_liked: isLiked, likes_count: likesCount }
          : p
      )
    );
  };

  const handlePostUpdate = (updatedPost) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
  };

  const handleDeleteSuccess = (idOrPostId) => {
    setPosts((prev) => {
      const postTrigger = prev.find((p) => p.id === idOrPostId);
      if (postTrigger) {
        const authorId = postTrigger.author?.id;
        if (authorId && String(authorId) !== String(currentUser?.id)) {
          return prev.filter((p) => p.author?.id !== authorId);
        }
      }
      return prev.filter((p) => p.id !== idOrPostId);
    });
  };

  return (
    <div data-cy="feed-container" className="flex flex-col">
      {posts.map((post, index) => {
        const isLast = posts.length === index + 1;
        const isHighlighted = String(post.id) === String(highlightId);

        return (
          <div key={post.id} data-cy="post-card">
            <PostCard
              post={post}
              currentUser={currentUser}
              isHighlighted={isHighlighted}
              highlightRef={(el) => {
                if (isLast) lastPostElementRef(el);
                if (isHighlighted) highlightRef.current = el;
              }}
              onPostUpdate={handlePostUpdate}
              onLikeUpdate={handleLikeUpdate}
              onCommentClick={() => setActivePostForComment(post)}
              onDeleteSuccess={handleDeleteSuccess}
            />
          </div>
        );
      })}

      {activePostForComment && (
        <CommentModal
          isOpen={!!activePostForComment}
          onClose={() => setActivePostForComment(null)}
          post={activePostForComment}
          onCommentAdded={() => {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === activePostForComment.id
                  ? {
                      ...p,
                      comments_count: (p.comments_count || 0) + 1,
                      user_has_commented: true,
                    }
                  : p
              )
            );
          }}
        />
      )}
    </div>
  );
};

export default Feed;
