import React from 'react';
import { Link } from 'react-router-dom';
import UserActionMenu from './UserActionMenu';

const Feed = ({ posts, currentUser, setPosts, lastPostElementRef }) => {
  return (
    <div className="divide-y divide-gray-800">
      {posts.map((post, index) => {
        const isLastElement = posts.length === index + 1;
        return (
          <div
            key={post.id}
            ref={isLastElement ? lastPostElementRef : null}
            className="p-4 hover:bg-white/[0.02] transition-colors flex gap-3"
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

                {/* MENU DE AÇÕES - Garantindo visibilidade */}
                <UserActionMenu 
                  targetProfile={post.author} 
                  postId={post.id}
                  isOwnPost={currentUser && post.author && String(currentUser.id) === String(post.author.id)}
                  onActionComplete={(id) => {
                    setPosts(prev => prev.filter(p => p.id !== id && p.author?.id !== id && p.author?.uuid !== id));
                  }}
                />
              </div>

              <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-[15px]">
                {post.content}
              </p>

              {/* RENDERIZAÇÃO DE MÍDIA (LÓGICA COMPLETA) */}
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
              
              <div className="mt-3 text-[11px] text-gray-600">
                {new Date(post.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Feed;