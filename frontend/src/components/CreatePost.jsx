import React, { useState } from 'react';
import { postsAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext'; // Importamos para pegar o avatar do user

const CreatePost = ({ onPostCreated }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMedia(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const resetState = () => {
    setContent('');
    setMedia(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (content.length > 280 || loading || (!content && !media)) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('content', content);
    if (media) formData.append('media', media);

    try {
      const response = await postsAPI.create(formData);
      resetState();
      // Notifica o Feed para injetar o post novo no topo
      if (onPostCreated) onPostCreated(response.data);
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Error creating post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border-b border-gray-800 bg-black">
      <div className="flex gap-4">
        {/* Avatar do Usuário Logado */}
        <img 
          src={user?.profile_picture || "/static/images/default-avatar.png"} 
          className="w-12 h-12 rounded-full object-cover border border-gray-800" 
          alt="avatar"
        />

        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <textarea
              className="w-full bg-transparent text-xl text-white outline-none py-2 resize-none placeholder-gray-500 min-h-[50px]"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={loading}
              rows={content.split('\n').length || 1}
            />

            {/* --- ÁREA DE PREVIEW --- */}
            {previewUrl && (
              <div className="relative mt-2 mb-4 group rounded-2xl overflow-hidden border border-gray-800">
                <button 
                  type="button"
                  onClick={() => { setMedia(null); setPreviewUrl(null); }}
                  className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 z-10 hover:bg-black transition-colors"
                >
                  ✕
                </button>
                {media?.type.startsWith('video') ? (
                  <video src={previewUrl} className="max-h-80 w-full object-cover" controls />
                ) : (
                  <img src={previewUrl} alt="Preview" className="max-h-80 w-full object-cover" />
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-gray-900 mt-2">
              <label className="flex items-center gap-2 cursor-pointer text-[#1D9BF0] hover:bg-[#1D9BF0]/10 p-2 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*,video/*" 
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </label>
              
              <div className="flex items-center gap-4">
                <span className={`text-xs ${content.length > 280 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                  {content.length}/280
                </span>

                <button
                  type="submit"
                  disabled={loading || (!content && !media) || content.length > 280}
                  className={`px-5 py-2 rounded-full font-bold transition-all ${
                    (loading || (!content && !media) || content.length > 280) 
                      ? 'bg-[#1D9BF0]/50 text-white/50 cursor-not-allowed' 
                      : 'bg-[#1D9BF0] text-white hover:bg-[#1A8CD8] active:scale-95'
                  }`}
                >
                  {loading ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreatePost;