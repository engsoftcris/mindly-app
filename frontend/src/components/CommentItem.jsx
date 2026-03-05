// frontend/src/components/CommentItem.jsx
import React, { useState, useMemo } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { FaEdit, FaTrash, FaCheck, FaTimes } from 'react-icons/fa';

const toId = (v) => {
  if (v == null) return null;
  if (typeof v === 'number' || typeof v === 'string') return String(v);

  if (typeof v === 'object') {
    if (v.id != null) return String(v.id);
    if (v.user != null) return toId(v.user);
    if (v.pk != null) return String(v.pk);
  }
  return null;
};

const CommentItem = ({ comment, currentUserId, postOwnerId, onDeleteSuccess }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editContent, setEditContent] = useState(comment.content || '');
  const [loading, setLoading] = useState(false);

  // No CommentItem.jsx, altere como pegamos o commentAuthorId:
const commentAuthorId = useMemo(() => {
  // Agora o author_id virá como '08b3aa69...' do backend
  const id = comment.author_id || comment.author?.id;
  return id ? String(id) : null;
}, [comment]);

const ownerPostId = useMemo(() => {
  // O postOwnerId que o Modal passa também está vindo como "4". 
  // Precisamos que o Modal passe o UUID!
  return postOwnerId ? String(postOwnerId) : null;
}, [postOwnerId]);

// E a comparação agora será UUID com UUID:
const isCommentOwner = !!(currentUserId && commentAuthorId && currentUserId === commentAuthorId);  const isPostOwner = !!(currentUserId && ownerPostId && currentUserId === ownerPostId);
  // Regras
  const canEdit = isCommentOwner; // ✅ autor sempre pode editar
  const canDelete = isCommentOwner || isPostOwner; // ✅ autor OU dono do post

 
  const handleUpdate = async () => {
    const next = (editContent || '').trim();

    if (!next || next === (comment.content || '').trim()) {
      setIsEditing(false);
      setEditContent(comment.content || '');
      return;
    }

    setLoading(true);
    try {
      // ✅ usa multipart pra evitar 415/validações quando o serializer tem image/media_url
      const form = new FormData();
      form.append('content', next);

      const response = await api.patch(`/comments/${comment.id}/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Atualiza o conteúdo exibido
      comment.content = response.data.content;
      setEditContent(response.data.content || '');

      setIsEditing(false);
      toast.success('Comentário atualizado!');
    } catch (err) {
      console.error('PATCH ERROR:', err?.response?.status, err?.response?.data);

      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.content?.[0] ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        JSON.stringify(err?.response?.data || {}) ||
        'Erro ao editar.';

      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/comments/${comment.id}/`);
      onDeleteSuccess(comment.id);
      toast.info('Comentário removido.');
    } catch (err) {
      console.error('DELETE ERROR:', err?.response?.status, err?.response?.data);
      const msg =
        err?.response?.data?.detail ||
        (typeof err?.response?.data === 'string' ? err.response.data : null) ||
        JSON.stringify(err?.response?.data || {}) ||
        'Erro ao eliminar.';
      toast.error(msg);
      setIsDeleting(false);
    } finally {
      setLoading(false);
    }
  };

 return (
  <div
    data-cy="comment-item"
    className="group relative flex space-x-3 p-3 rounded-xl hover:bg-white/[0.03] transition-all duration-200"
  >
    <img
      data-cy="comment-avatar"
      src={
        comment.author_avatar ||
        `https://ui-avatars.com/api/?name=${comment.author_name}`
      }
      className="w-10 h-10 rounded-full object-cover border border-gray-800 flex-shrink-0"
      alt="avatar"
    />

    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-1">
          <span
            data-cy="comment-author"
            className="font-bold text-sm text-white truncate"
          >
            {comment.author_name}
          </span>
          <span className="text-gray-500 text-[10px]">
            · {new Date(comment.created_at).toLocaleDateString()}
          </span>
        </div>

        {!isEditing && !isDeleting && (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {canEdit && (
              <button
                data-cy="comment-edit"
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-full"
                title="Edit comment"
                type="button"
              >
                <FaEdit size={14} />
              </button>
            )}

            {canDelete && (
              <button
                data-cy="comment-delete"
                onClick={() => setIsDeleting(true)}
                className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-full"
                title={
                  isPostOwner && !isCommentOwner
                    ? 'Remove comment (moderation)'
                    : 'Delete'
                }
                type="button"
              >
                <FaTrash size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {isEditing && (
        <div className="mt-2 space-y-2">
          <textarea
            data-cy="comment-edit-input"
            className="w-full bg-black text-white p-2 rounded-lg border border-blue-500 text-sm focus:outline-none resize-none"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows="3"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button
              data-cy="comment-cancel"
              onClick={() => {
                setIsEditing(false);
                setEditContent(comment.content || '');
              }}
              className="text-gray-400"
              type="button"
              title="Cancel"
            >
              <FaTimes size={14} />
            </button>

            <button
              data-cy="comment-save"
              onClick={handleUpdate}
              disabled={loading}
              className="text-blue-500"
              type="button"
              title="Save"
            >
              {loading ? '...' : <FaCheck size={14} />}
            </button>
          </div>
        </div>
      )}

      {isDeleting && (
        <div className="mt-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
          <span className="text-red-500 text-sm font-medium">
            {isPostOwner && !isCommentOwner
              ? 'Remove this comment from your post?'
              : 'Delete your comment?'}
          </span>
          <div className="flex gap-4">
            <button
              data-cy="comment-delete-cancel"
              onClick={() => setIsDeleting(false)}
              className="text-gray-400 hover:text-white text-xs font-bold uppercase"
              type="button"
            >
              Cancel
            </button>
            <button
              data-cy="comment-delete-confirm"
              onClick={handleDelete}
              disabled={loading}
              className="text-red-500 hover:text-red-400 text-xs font-bold uppercase"
              type="button"
            >
              {loading ? '...' : 'Confirm'}
            </button>
          </div>
        </div>
      )}

      {!isEditing && !isDeleting && (
        <div className="mt-0.5">
          <p
            data-cy="comment-content"
            className="text-gray-300 text-[14px] leading-normal whitespace-pre-wrap break-words"
          >
            {comment.content}
          </p>

          {(comment.media_url || comment.image) && (
            <div className="mt-2 relative inline-block overflow-hidden rounded-2xl border border-gray-800 bg-black">
              <img
                data-cy="comment-media"
                src={comment.media_url || comment.image}
                className="max-h-52 w-full object-cover"
                alt="media"
              />
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
};

export default CommentItem;