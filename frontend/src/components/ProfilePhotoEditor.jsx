import React, { useState, useRef } from 'react';

const ProfilePhotoEditor = ({ currentImage, onFileSelect }) => {
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      onFileSelect(file); 
    }
  };

  return (
    <div className="flex justify-center mb-8">
      <div 
        className="relative group cursor-pointer"
        onClick={handleImageClick}
        title="Clique para alterar a foto"
      >
        {/* Imagem com borda azul se hover ou selecionada */}
        <img
          src={preview || currentImage || "/static/images/default-avatar.png"}
          className="w-28 h-28 rounded-full object-cover border-4 border-gray-900 group-hover:border-[#1D9BF0] transition-all shadow-2xl"
          alt="Avatar Edit"
        />
        
        {/* Overlay escuro com ícone de câmera que aparece no hover */}
        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white drop-shadow-md">
            <path d="M19.708 22H4.292C3.028 22 2 20.972 2 19.708V7.292C2 6.028 3.028 5 4.292 5H7l2-3h6l2 3h2.708C20.972 5 22 6.028 22 7.292v12.416C22 20.972 20.972 22 19.708 22zM12 18c-2.757 0-5-2.243-5-5s2.243-5 5-5 5 2.243 5 5-2.243 5-5 5z"/>
          </svg>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        data-cy="profile-file-input"
      />
    </div>
  );
};

export default ProfilePhotoEditor;