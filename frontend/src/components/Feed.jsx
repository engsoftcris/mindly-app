import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom'; // Importamos useLocation
import UserActionMenu from './UserActionMenu';
import LikeButton from './LikeButton';
import CommentButton from './CommentButton';
import CommentModal from './CommentModal';
import ReportButton from './ReportModal';

const Feed = ({ posts, currentUser, setPosts, lastPostElementRef }) => {
  const [activePostForComment, setActivePostForComment] = React.useState(null);
  
  // Lógica de Scroll
  const location = useLocation();
  const highlightRef = useRef(null);
  const queryParams = new URLSearchParams(location.search);
  const highlightId = queryParams.get('highlight');

  useEffect(() => {
    // Se houver um post para destacar e ele estiver na lista
    if (highlightId && posts.length > 0 && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300); // Um delay leve para garantir que o feed carregou
    }
  }, [posts, highlightId]);

  const handleLikeUpdate = (postId, isLiked, likesCount) => {
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, is_liked: isLiked, likes_count: likesCount } 
        : p
    ));
  };

  return (
    <div className="divide-y divide-gray-800">
      {posts.map((post, index) => {
        const isLastElement = posts.length === index + 1;
        const isHighlighted = String(post.id) === String(highlightId);

        return (
          <div
            key={post.id}
            data-cy="post-card"
            // Ajuste na REF: Se for o último, usa o scroll infinito. Se for o destaque, usa o highlightRef.
            ref={(el) => {
              if (isLastElement) lastPostElementRef(el);
              if (isHighlighted) highlightRef.current = el;
            }}
            className={`p-4 transition-colors flex gap-3 ${
              isHighlighted ? 'bg-blue-500/10 border-l-2 border-blue-500' : 'hover:bg-white/[0.02]'
            }`}
          >
            {/* AVATAR */}
            <Link to={`/profile/${post.author?.uuid || post.author?.id}`} className="flex-shrink-0">
              <img
                src={post.author?.profile_picture || `https://ui-avatars.com/api/?name=${post.author?.username}&background=random`}
                className="w-12 h-12 rounded-full object-cover border border-gray-800 hover:brightness-90 transition"
                alt="avatar"
              />
            </Link>

            <div className="flex-1 min-w-0">
              {/* HEADER DO POST */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1 mb-1 min-w-0">
                  <Link 
                    to={`/profile/${post.author?.uuid || post.author?.id}`} 
                    className="font-bold text-white hover:underline cursor-pointer truncate"
                  >
                    {post.author?.display_name || post.author?.username}
                  </Link>
                  <span className="text-gray-500 text-sm truncate">@{post.author?.username}</span>
                </div>

                <UserActionMenu 
                  targetProfile={post.author} 
                  postId={post.id}
                  isOwnPost={currentUser && post.author && String(currentUser.id) === String(post.author.id)}
                  onActionComplete={(id) => {
                    setPosts(prev => prev.filter(p => p.id !== id && p.author?.id !== id && p.author?.uuid !== id));
                  }}
                />
              </div>

              <p data-cy="post-content" className="text-gray-200 leading-relaxed whitespace-pre-wrap text-[15px]">
                {post.content}
              </p>

              {/* RENDERIZAÇÃO DE MÍDIA (Mantida igual) */}
              {(post.media_url || post.media) && (() => {
                const mediaSrc = post.media_url || post.media;
                const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(mediaSrc);
                const isPending = post.moderation_status === "PENDING";
                const isRejected = post.moderation_status === "REJECTED";

                if (isRejected) return (
                  <div className="mt-3 p-4 rounded-xl border border-red-900/30 bg-red-900/10 text-center text-red-500 text-xs font-bold">
                    Conteúdo removido por violação das diretrizes.
                  </div>
                );

                return (
                  <div className="relative mt-3 overflow-hidden rounded-2xl border border-gray-800 bg-black">
                    {isVideo ? (
                      <video src={mediaSrc} controls={!isPending} className={`max-h-96 w-full object-cover ${isPending ? "blur-2xl opacity-40" : ""}`} />
                    ) : (
                      <img src={mediaSrc} className={`max-h-96 w-full object-cover ${isPending ? "blur-2xl opacity-40" : ""}`} alt="Post" />
                    )}
                    {isPending && (
                      <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm text-blue-400 font-bold text-xs uppercase p-2">
                        Conteúdo em Análise
                      </div>
                    )}
                  </div>
                );
              })()}
              
              {/* BARRA DE INTERAÇÕES */}
              <div className="mt-3 flex items-center gap-8">
                <LikeButton 
                  post={post} 
                  onLikeToggle={handleLikeUpdate} 
                />
                
                <CommentButton 
                  count={post.comments_count} 
                  hasCommented={post.user_has_commented}
                  onClick={() => setActivePostForComment(post)} 
                />
                {/* 2. Adicionar o ReportButton (Não aparece nos próprios posts do usuário) */}
                {currentUser && post.author && String(currentUser.id) !== String(post.author.id) && (
                   <ReportButton postId={post.id} />
                )}

                <span className="text-[11px] text-gray-600 ml-auto">
                  {new Date(post.created_at).toLocaleString('pt-PT', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* MODAL DE COMENTÁRIO */}
      {activePostForComment && (
        <CommentModal 
          isOpen={!!activePostForComment} 
          onClose={() => setActivePostForComment(null)} 
          post={activePostForComment}
          onCommentAdded={() => {
            setPosts(prev => prev.map(p => 
              p.id === activePostForComment.id 
                ? { ...p, comments_count: (p.comments_count || 0) + 1, user_has_commented: true } 
                : p
            ));
          }}
        />
      )}
    </div>
  );
};

export default Feed;