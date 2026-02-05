import React, { useState } from 'react';
import { postsAPI } from '../api/axios';

const CreatePostModal = ({ isOpen, onClose, refreshPosts }) => {
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // New logic to validate video duration locally
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMedia(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Final check for content length
    if (content.length > 280) return;
    
    setLoading(true);

    // Use FormData for file uploads
    const formData = new FormData();
    formData.append('content', content);
    if (media) {
      formData.append('media', media);
    }

    try {
      // We pass the formData to your API service
      const response = await postsAPI.create(formData);
      
      console.log("Post created!", response.data);
      setContent('');
      setMedia(null);
      onClose();
      
      if (refreshPosts) refreshPosts();
      
    } catch (error) {
      console.error("Integration Error:", error.response?.data || error.message);
      // Backend validation errors will appear here
      const errorMsg = error.response?.data?.media || error.response?.data?.content || "Something went wrong";
      alert("Error: " + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
        
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create new post</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <textarea
            className="w-full h-32 p-3 text-gray-700 dark:text-gray-200 bg-transparent border-none focus:ring-0 resize-none placeholder-gray-400 text-lg outline-none"
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
          />

          <div className="flex items-center justify-between pt-4 border-t dark:border-gray-700">
            <label className="flex items-center gap-2 cursor-pointer text-blue-500 hover:text-blue-600 font-medium text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {media ? media.name : "Add Photo/Video"}
              <input 
                type="file" 
                className="hidden" 
                accept="image/*,video/*" 
                onChange={handleFileChange} // Use the new handler
                disabled={loading}
              />
            </label>
            
            <span className={`text-sm ${content.length > 280 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
              {content.length}/280
            </span>

            <button
              type="submit"
              disabled={loading || (!content && !media) || content.length > 280}
              className={`px-6 py-2 rounded-full font-bold text-white transition-all ${
                (loading || (!content && !media) || content.length > 280) ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {loading ? "Posting..." : "Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;