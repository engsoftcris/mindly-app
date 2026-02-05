import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { postsAPI } from "../api/axios";
import CreatePostModal from "../components/CreatePostModal";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // 1. Função para carregar os posts do backend
  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const response = await postsAPI.list();
      setPosts(response.data);
    } catch (error) {
      console.error("Erro ao buscar posts:", error);
    } finally {
      setLoadingPosts(false);
    }
  };

  // 2. Busca os posts assim que a página abre
  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-xl shadow-md">
      {/* Header do Perfil (Mantido exatamente o seu) */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <img
            src={user?.profile_picture || "https://via.placeholder.com/150"}
            alt="Profile"
            className="w-20 h-20 rounded-full border-2 border-blue-500 object-cover"
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Hello, {user?.full_name || user?.username}!
            </h1>
            <p className="text-gray-500 text-sm">
              Welcome
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-all transform hover:scale-105"
        >
          + New Post
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h3 className="font-semibold text-blue-700 text-sm uppercase tracking-wider">
            Status
          </h3>
          <p className="text-md text-blue-600 font-medium mt-1">
            {user?.is_private ? "🔒 Private Account" : "🌍 Public Account"}
          </p>
        </div>

        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
          <h3 className="font-semibold text-green-700 text-sm uppercase tracking-wider">
            Auth Provider
          </h3>
          <p className="text-md text-green-600 font-medium mt-1 uppercase">
            {user?.provider}
          </p>
        </div>
      </div>

      {/* --- NOVA SEÇÃO: LISTAGEM DE POSTS --- */}
      <div className="mt-10 border-t pt-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          Your Posts
        </h2>

        {loadingPosts ? (
          <p className="text-center text-gray-500">Loading your feed...</p>
        ) : posts.length > 0 ? (
          <div className="space-y-6">
            {posts.map((post) => (
              <div
                key={post.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm"
              >
                <p className="text-gray-800 whitespace-pre-wrap">
                  {post.content}
                </p>
               {post.media && (
  <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 bg-black">
 {post.media && (
  /* Using a Regex to catch multiple video formats */
  post.media.match(/\.(mp4|webm|mov|ogg)$/i) ? (
    <video
      key={post.id}
      src={post.media}
      controls
      preload="metadata"
      className="w-full max-h-96 bg-black rounded-lg"
    >
      Your browser does not support the video tag.
    </video>
  ) : (
    <img
      src={post.media}
      className="w-full max-h-96 object-cover rounded-lg"
      alt="Post content"
    />
  )
)}



  </div>
)}
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-medium">
  {new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}
</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-gray-400">No posts found yet.</p>
          </div>
        )}
      </div>

      <button
        onClick={logout}
        className="mt-10 text-gray-400 hover:text-red-500 font-medium text-xs transition-colors block mx-auto underline"
      >
        Safe logout
      </button>

      {/* MODAL (Recebendo refreshPosts para atualizar a lista ao fechar) */}
      <CreatePostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        refreshPosts={fetchPosts}
      />
    </div>
  );
};

export default Dashboard;
