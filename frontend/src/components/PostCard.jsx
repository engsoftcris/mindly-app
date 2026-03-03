// frontend/src/components/PostCard.jsx
import React, { useState, useEffect, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { postsAPI } from '../api/axios';
import { toast } from 'react-toastify';
import UserActionMenu from './UserActionMenu';
import LikeButton from './LikeButton';
import CommentButton from './CommentButton';
import ReportButton from './ReportModal';

const getId = (v) => {
  if (v == null) return null;
  if (typeof v === 'number' || typeof v === 'string') return String(v);
  if (typeof v === 'object') {
    if (v.user_id != null) return String(v.user_id);
    if (v.id != null) return String(v.id);
    if (v.user != null) return getId(v.user);
    if (v.pk != null) return String(v.pk);
  }
  return null;
};

const getProfileId = (author) => {
  // Author no seu feed pode vir como:
  // - { id: <profile_uuid>, profile_id: <profile_uuid>, ... }
  // - ou { profile_id: ... }
  // Mantém compatível
  return (
    author?.profile_id ||
    author?.id || // no seu serializer atual, id = profile.id
    author?.uuid ||
    null
  );
};

const isVideoUrl = (url) => /\.(mp4|webm|mov|mkv|avi)$/i.test(url || '');

const PostCard = ({
  post: initialPost,
  currentUser,
  onLikeUpdate,
  onCommentClick,
  onDeleteSuccess,
  onPostUpdate,
  highlightRef,
  isHighlighted,
}) => {
  const [post, setPost] = useState(initialPost);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(initialPost?.content || '');
  const [loading, setLoading] = useState(false);

  // Keep local state synced with parent updates
  useEffect(() => {
    setPost(initialPost);
    if (!isEditing) setEditContent(initialPost?.content || '');
  }, [initialPost, isEditing]);

  const author = post?.author;

  // ✅ IDs normalizados (strings)
  const currentUserId = useMemo(
    () => (currentUser?.user_id != null ? String(currentUser.user_id) : getId(currentUser?.id)),
    [currentUser]
  );

  const authorUserId = useMemo(
  () => (author?.id != null ? String(author.id) : null),
  [author]
);

  const profileIdForLink = useMemo(() => getProfileId(author), [author]);

  // ✅ Agora isOwnPost compara USER.id com author.user_id
  const isOwnPost = !!(currentUserId && authorUserId && currentUserId === authorUserId);

  const isPending = post?.moderation_status === 'PENDING';
  const isRejected = post?.moderation_status === 'REJECTED';

  const handleUpdate = async () => {
    const next = (editContent || '').trim();
    if (!next || next === (post?.content || '').trim()) {
      setIsEditing(false);
      setEditContent(post?.content || '');
      return;
    }

    setLoading(true);
    try {
      const response = await postsAPI.update(post.id, { content: next });

      setPost(response.data);
      if (onPostUpdate) onPostUpdate(response.data);

      toast.success('Post updated and sent for review.');
      setIsEditing(false);
    } catch (error) {
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.content?.[0] ||
        'Could not update the post.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (isRejected) {
    return (
      <div className="p-4 border-b border-gray-800 bg-red-900/5 text-center text-red-500 text-[11px] font-bold uppercase tracking-wider">
        Content removed for violating guidelines.
      </div>
    );
  }

  const mediaUrl = post?.media_url || post?.media || null;

  return (
    <div
      ref={highlightRef}
      className={`p-4 transition-colors flex gap-3 ${
        isHighlighted ? 'bg-blue-500/10 border-l-2 border-blue-500' : 'hover:bg-white/[0.02]'
      } border-b border-gray-800`}
    >
      {/* Avatar */}
      <Link to={`/profile/${profileIdForLink || ''}`} className="flex-shrink-0">
        <img
          src={
            author?.profile_picture ||
            `https://ui-avatars.com/api/?name=${author?.username || 'user'}&background=random`
          }
          className="w-12 h-12 rounded-full object-cover border border-gray-800"
          alt="avatar"
          loading="lazy"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1 mb-1 min-w-0">
            <Link
              to={`/profile/${profileIdForLink || ''}`}
              className="font-bold text-white hover:underline truncate"
            >
              {author?.display_name || author?.username}
            </Link>
            <span className="text-gray-500 text-sm truncate">@{author?.username}</span>
          </div>

         <UserActionMenu
  targetProfile={{
    ...author,
    id: profileIdForLink,
    is_blocked: author?.is_blocked // Importante: o Serializer que ajustamos envia isso!
  }}
  currentUserId={currentUserId}
  postId={post?.id}
  isOwnPost={isOwnPost}
  onActionComplete={(blockedId) => {
    // Se o onActionComplete retornar um ID de perfil (bloqueio), 
    // chamamos uma função no pai para limpar o feed.
    // Se o seu pai (Feed.jsx) usa onDeleteSuccess, passe o ID do post ou do autor.
    if (onDeleteSuccess) {
      // Dica: Se você passar o post.id, só esse post some. 
      // Se o seu Feed.jsx for esperto, ele pode filtrar por autor.
      onDeleteSuccess(post.id); 
    }
    
    // Opcional: Se quiser dar um "refresh" suave ou feedback:
    console.log(`Usuário ${blockedId} bloqueado. Removendo conteúdo...`);
  }}
  onEditClick={() => setIsEditing(true)}
/>
        </div>

        {isEditing ? (
          <div className="mt-2 space-y-2">
            <textarea
              className="w-full bg-gray-900 text-white p-3 rounded-xl border border-blue-500 focus:outline-none text-[15px] min-h-[100px] resize-none"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(post?.content || '');
                }}
                className="px-3 py-1 text-sm text-gray-400 hover:text-white"
                disabled={loading}
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={loading || !(editContent || '').trim()}
                className="px-4 py-1 text-sm bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 disabled:opacity-50"
                type="button"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-200 leading-relaxed whitespace-pre-wrap text-[15px]">
            {post?.content}
          </p>
        )}

        {/* Media */}
        {mediaUrl && (
          <div className="relative mt-3 overflow-hidden rounded-2xl border border-gray-800 bg-black">
            {isVideoUrl(mediaUrl) ? (
              <video
                src={mediaUrl}
                controls={!isPending}
                preload="metadata"
                className={`max-h-96 w-full object-cover ${isPending ? 'blur-2xl opacity-40' : ''}`}
              />
            ) : (
              <img
                src={mediaUrl}
                loading="lazy"
                className={`max-h-96 w-full object-cover ${isPending ? 'blur-2xl opacity-40' : ''}`}
                alt="Post media"
              />
            )}

            {isPending && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm text-blue-400 font-bold text-xs uppercase p-2 text-center">
                Content under review
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-8">
          <LikeButton post={post} onLikeToggle={onLikeUpdate} />

          <CommentButton
            count={post?.comments_count || 0}
            hasCommented={!!post?.user_has_commented}
            onClick={() => (onCommentClick ? onCommentClick(post) : null)} // ✅ safe + passa o post
          />

          {currentUser && !isOwnPost && <ReportButton postId={post?.id} />}

          <span className="text-[11px] text-gray-600 ml-auto">
            {post?.created_at ? new Date(post.created_at).toLocaleDateString() : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(PostCard);