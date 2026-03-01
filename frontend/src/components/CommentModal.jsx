// frontend/src/components/CommentModal.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaTimes, FaRegImage, FaRegSmile } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CommentItem from './CommentItem';
import GiftSelector from './GiftSelector';

const MAX_CHARS = 280;

const getId = (v) => {
  if (v == null) return null;
  if (typeof v === 'number' || typeof v === 'string') return String(v);

  if (typeof v === 'object') {
    if (v.id != null) return String(v.id);
    if (v.user != null) return getId(v.user);
    if (v.pk != null) return String(v.pk);
  }
  return null;
};

const CommentModal = ({ post, isOpen, onClose, onCommentAdded }) => {
  const { user: currentUser } = useAuth();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [canUseGifts, setCanUseGifts] = useState(true);
  const [showGiftSelector, setShowGiftSelector] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const charsLeft = MAX_CHARS - newComment.length;

  // Logged-in user id (Django User.id)
  const currentUserId = currentUser?.user_id != null ? String(currentUser.user_id) : null;

  // Post owner id (Django User.id)
  const postOwnerId = useMemo(() => {
    return getId(
      post?.author?.id ??
      post?.author?.user?.id ??
      post?.author?.user ??
      post?.user?.id ??
      post?.user
    );
  }, [post]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed.');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setSelectedGift(null);
  };

  useEffect(() => {
    if (isOpen && post?.id) {
      fetchComments();
      setSelectedGift(null);
      setSelectedImage(null);
      setImagePreview(null);
      setNewComment('');
      setShowGiftSelector(false);

      // reset file input so selecting the same file again triggers onChange
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, post?.id]);

  const fetchComments = async () => {
    setFetching(true);
    try {
      const response = await api.get(`/comments/?post_id=${post.id}`);
      setComments(response.data);
    } catch (error) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load replies.');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && !selectedGift && !selectedImage) return;

    setLoading(true);

    const formData = new FormData();
    formData.append('post', post.id);
    formData.append('content', newComment);

    if (selectedGift) {
      formData.append('media_url', selectedGift);
      formData.append('is_gif', 'true');
    } else if (selectedImage) {
      formData.append('image', selectedImage);
      formData.append('is_gif', 'false');
    }

    try {
      const response = await api.post('/comments/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setNewComment('');
      setSelectedGift(null);
      setSelectedImage(null);
      setImagePreview(null);
      setShowGiftSelector(false);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setComments((prev) => [response.data, ...prev]);
      if (onCommentAdded) onCommentAdded();

      toast.success('Reply posted.');
    } catch (error) {
      console.error('Error posting comment:', error?.response?.status, error?.response?.data);
      const msg =
        error?.response?.data?.detail ||
        (typeof error?.response?.data === 'string' ? error.response.data : null) ||
        'Could not post reply.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      data-cy="comment-modal"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-blue-900/10 backdrop-blur-sm p-4"
    >
      <div
        data-cy="comment-modal-card"
        className="bg-black border border-gray-800 w-full max-w-xl rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-black/50 sticky top-0 z-10">
          <div className="flex items-center gap-6">
            <button
              data-cy="comment-close"
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition text-white"
              type="button"
            >
              <FaTimes size={18} />
            </button>
            <span className="font-bold text-white text-xl">Reply</span>
          </div>
        </div>

        <div
          data-cy="comment-modal-body"
          className="flex-1 overflow-y-auto p-4 custom-scrollbar"
        >
          {/* Original Post */}
          <div data-cy="original-post" className="flex space-x-3 mb-2">
            <div className="flex flex-col items-center">
              <img
                data-cy="original-post-avatar"
                src={
                  post.author?.profile_picture ||
                  `https://ui-avatars.com/api/?name=${post.author?.username}`
                }
                className="w-12 h-12 rounded-full object-cover border border-gray-800"
                alt="author"
              />
              <div className="w-0.5 h-full bg-gray-800 my-1"></div>
            </div>

            <div className="pb-4">
              <div className="flex items-center space-x-1">
                <span data-cy="original-post-author" className="font-bold text-white">
                  {post.author?.display_name || post.author?.username}
                </span>
                <span data-cy="original-post-username" className="text-gray-500 text-sm">
                  @{post.author?.username}
                </span>
              </div>
              <p data-cy="original-post-content" className="text-gray-300 mt-1 leading-normal">
                {post.content}
              </p>
            </div>
          </div>

          {/* New Comment Input */}
          <form data-cy="comment-form" onSubmit={handleSubmit} className="flex space-x-3 mb-8">
            <div className="w-12 flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-gray-700 border border-gray-800 flex items-center justify-center text-white font-bold">
                ?
              </div>
            </div>

            <div className="flex-1">
              <textarea
                data-cy="comment-input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Post your reply"
                maxLength={MAX_CHARS}
                className="w-full text-xl bg-transparent border-none focus:ring-0 resize-none py-2 text-white placeholder-gray-600"
                rows="3"
                autoFocus
              />

              {/* GIF preview */}
              {selectedGift && (
                <div data-cy="gif-preview" className="relative mb-4 inline-block">
                  <img
                    data-cy="gif-preview-image"
                    src={selectedGift}
                    className="rounded-xl max-h-40 border border-gray-800"
                    alt="Selected GIF"
                  />
                  <button
                    data-cy="remove-gif"
                    type="button"
                    onClick={() => setSelectedGift(null)}
                    className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full text-white hover:bg-black"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              )}

              {/* Image preview */}
              {imagePreview && (
                <div data-cy="image-preview" className="relative mb-4 inline-block">
                  <img
                    data-cy="image-preview-display"
                    src={imagePreview}
                    className="mt-2 rounded-xl w-[300px] h-[180px] border border-gray-800 object-cover"
                    alt="Selected"
                  />
                  <button
                    data-cy="remove-image"
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 bg-black/70 p-1.5 rounded-full text-white hover:bg-black"
                  >
                    <FaTimes size={12} />
                  </button>
                </div>
              )}

              {/* Toolbar */}
              <div className="flex items-center justify-between border-t border-gray-800 pt-3 mt-2">
                <div className="flex items-center gap-1">
                  {canUseGifts && (
                    <div className="relative">
                      <button
                        data-cy="open-gif"
                        type="button"
                        onClick={() => setShowGiftSelector((v) => !v)}
                        className="hover:bg-blue-400/10 p-2 rounded-full transition text-blue-400"
                      >
                        <FaRegSmile size={20} />
                      </button>

                      {showGiftSelector && (
                        <GiftSelector
                          onClose={() => setShowGiftSelector(false)}
                          onSelect={(url) => {
                            setSelectedGift(url);
                            setShowGiftSelector(false);
                            setSelectedImage(null);
                            setImagePreview(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          setCanUseGifs={setCanUseGifts}
                        />
                      )}
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    data-cy="file-input"
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />

                  <button
                    data-cy="open-image"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="hover:bg-blue-400/10 p-2 rounded-full transition text-blue-400"
                  >
                    <FaRegImage size={20} />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <span data-cy="chars-left" className="text-[12px] text-gray-500">
                    {charsLeft}
                  </span>

                  <button
                    data-cy="reply-submit"
                    type="submit"
                    disabled={(!newComment.trim() && !selectedGift && !selectedImage) || loading}
                    className="bg-blue-500 text-white px-6 py-1.5 rounded-full font-bold disabled:opacity-50 hover:bg-blue-600 transition"
                  >
                    {loading ? '...' : 'Reply'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          <div className="h-px bg-gray-800 mb-6"></div>

          {/* Comments list */}
          <div data-cy="comments-list" className="space-y-6 mb-4">
            {fetching ? (
              <div className="text-center text-gray-500 py-4 text-sm">Loading replies...</div>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUserId={currentUserId}
                  postOwnerId={postOwnerId}
                  onDeleteSuccess={(id) => setComments((prev) => prev.filter((c) => c.id !== id))}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;