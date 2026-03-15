// frontend/src/components/PostCard.jsx
import React, { useState, useEffect, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { postsAPI } from '../api/axios';
import { toast } from 'react-toastify';
import UserActionMenu from './UserActionMenu';
import LikeButton from './LikeButton';
import CommentButton from './CommentButton';
import ReportButton from './ReportModal';

const getProfileId = (author) => {
  return author?.profile_id || author?.id || author?.uuid || null;
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

  useEffect(() => {
    setPost(initialPost);
    if (!isEditing) setEditContent(initialPost?.content || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPost]);

  const author = post?.author;

  const currentUserId = useMemo(() => {
    const id = currentUser?.id || currentUser?.profile_id;
    return id ? String(id) : null;
  }, [currentUser]);

  const authorUserId = useMemo(() => {
    const id = author?.profile_id || author?.id;
    return id ? String(id) : null;
  }, [author]);

  const isOwnPost = useMemo(() => {
    if (!currentUserId || !authorUserId) return false;
    return currentUserId === authorUserId;
  }, [currentUserId, authorUserId]);

  const profileIdForLink = useMemo(() => getProfileId(author), [author]);

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
      const formData = new FormData();
      formData.append('content', next);
      const response = await postsAPI.update(post.id, formData);
      setPost(response.data);
      if (onPostUpdate) onPostUpdate(response.data);
      toast.success('Post updated and sent for review.');
      setIsEditing(false);
    } catch (_error) {
      console.error('Erro na edição:', _error.response?.data);
      const msg =
        _error?.response?.data?.detail ||
        _error?.response?.data?.content?.[0] ||
        'Could not update the post.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (isRejected) {
    return (
      <div
        data-cy="post-rejected-message"
        className="p-4 border-b border-gray-800 bg-red-900/5 text-center text-red-500 text-[11px] font-bold uppercase tracking-wider"
      >
        Content removed for violating guidelines.
      </div>
    );
  }

  const mediaUrl = post?.media_url || post?.media || null;

  return (
    <div
      ref={highlightRef}
      data-cy={`post-card-${post?.id}`}
      className={`p-4 transition-colors flex gap-3 ${
        isHighlighted
          ? 'bg-blue-500/10 border-l-2 border-blue-500'
          : 'hover:bg-white/[0.02]'
      } border-b border-gray-800`}
    >
      {/* Avatar */}
      <Link
        to={`/profile/${profileIdForLink || ''}`}
        className="flex-shrink-0"
        data-cy="post-author-avatar"
      >
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
              data-cy="post-author-name"
              className="font-bold text-white hover:underline truncate"
            >
              {author?.display_name || author?.username}
            </Link>
            <span
              className="text-gray-500 text-sm truncate"
              data-cy="post-author-handle"
            >
              @{author?.username}
            </span>
          </div>

          <UserActionMenu
            targetProfile={{
              ...author,
              id: profileIdForLink,
              is_blocked: author?.is_blocked,
            }}
            currentUserId={currentUserId}
            postId={post?.id}
            isOwnPost={isOwnPost}
            onActionComplete={(_blockedId) => {
              if (onDeleteSuccess) onDeleteSuccess(post.id);
            }}
            onEditClick={() => setIsEditing(true)}
          />
        </div>

        {isEditing ? (
          <div className="mt-2 space-y-2" data-cy="post-edit-container">
            <textarea
              data-cy="post-edit-input"
              className="w-full bg-gray-900 text-white p-3 rounded-xl border border-blue-500 focus:outline-none text-[15px] min-h-[100px] resize-none"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                data-cy="post-edit-cancel"
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
                data-cy="post-edit-save"
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
          <p
            className="text-gray-200 leading-relaxed whitespace-pre-wrap text-[15px]"
            data-cy="post-content"
          >
            {post?.content}
          </p>
        )}

        {/* Media */}
        {mediaUrl && (
          <div
            className="relative mt-3 overflow-hidden rounded-2xl border border-gray-800 bg-black"
            data-cy="post-media-container"
          >
            {isVideoUrl(mediaUrl) ? (
              <video
                data-cy="post-video"
                src={mediaUrl}
                controls={!isPending}
                preload="metadata"
                className={`max-h-96 w-full object-cover ${isPending ? 'blur-2xl opacity-40' : ''}`}
              />
            ) : (
              <img
                data-cy="post-image"
                src={mediaUrl}
                loading="lazy"
                className={`max-h-96 w-full object-cover ${isPending ? 'blur-2xl opacity-40' : ''}`}
                alt="Post media"
              />
            )}
            {isPending && (
              <div
                data-cy="post-moderation-badge"
                className="absolute inset-0 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm text-blue-400 font-bold text-xs uppercase p-2 text-center"
              >
                Content under review
              </div>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center gap-8">
          <LikeButton
            post={post}
            onLikeToggle={onLikeUpdate}
            data-cy="post-like-button"
          />

          <CommentButton
            count={post?.comments_count || 0}
            hasCommented={!!post?.user_has_commented}
            onClick={() => (onCommentClick ? onCommentClick(post) : null)}
            data-cy="post-comment-button"
          />

          {currentUser && !isOwnPost && (
            <ReportButton postId={post?.id} data-cy="post-report-button" />
          )}

          <span
            className="text-[11px] text-gray-600 ml-auto"
            data-cy="post-date"
          >
            {post?.created_at
              ? new Date(post.created_at).toLocaleDateString()
              : ''}
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(PostCard);
