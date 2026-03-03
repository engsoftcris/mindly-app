// frontend/src/components/MediaLightbox.jsx
import React, { useEffect, useRef } from 'react';

const MediaLightbox = ({ isOpen, onClose, mediaList, currentIndex, onPrev, onNext }) => {
  const containerRef = useRef(null);

  // Focar o container automaticamente ao abrir para capturar eventos de teclado
  useEffect(() => {
    if (isOpen) {
      containerRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen || !mediaList[currentIndex]) return null;

  const currentPost = mediaList[currentIndex];
  const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(currentPost.media_url);

  // Handler centralizado para teclado (ESC e Navegação)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight' && currentIndex < mediaList.length - 1) onNext();
    if (e.key === 'ArrowLeft' && currentIndex > 0) onPrev();
  };

  return (
    <div 
      ref={containerRef}
      id="lightbox-container"
      tabIndex="0" // Permite foco para capturar onKeyDown
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center backdrop-blur-sm outline-none"
    >
      {/* Botão Fechar */}
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white hover:bg-white/10 p-2 rounded-full z-[1001] transition"
        aria-label="Close lightbox"
      >
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
          <path d="M18.293 5.293l-1.293-1.293L12 9.586 7 4.586 5.707 5.879 10.707 10.879l-5 5 1.293 1.293 5-5 5 5 1.293-1.293-5-5z"/>
        </svg>
      </button>

      {/* Navegação Esquerda */}
      {currentIndex > 0 && (
        <button 
          onClick={onPrev} 
          className="absolute left-4 p-4 text-white hover:bg-white/10 rounded-full z-[1001] transition md:left-10"
        >
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current rotate-180">
            <path d="M11 13l5.086 5.086-1.414 1.414L6.758 11.586l7.914-7.914 1.414 1.414L11 11H21v2H11z"/>
          </svg>
        </button>
      )}

      {/* Content Container - Clique no fundo fecha o modal */}
      <div className="relative w-full h-full flex items-center justify-center p-4 md:p-20" onClick={onClose}>
        <div 
          className="max-w-full max-h-full flex items-center justify-center" 
          onClick={(e) => e.stopPropagation()} // Impede fechar ao clicar na imagem/vídeo
        >
          {isVideo ? (
            <video 
              src={currentPost.media_url} 
              className="max-h-[90vh] max-w-full shadow-2xl rounded-sm"
              controls 
              autoPlay
            />
          ) : (
            <img 
              src={currentPost.media_url} 
              className="max-h-[90vh] max-w-full object-contain shadow-2xl rounded-sm"
              alt="Profile Media" 
            />
          )}
        </div>
      </div>

      {/* Navegação Direita */}
      {currentIndex < mediaList.length - 1 && (
        <button 
          onClick={onNext} 
          className="absolute right-4 p-4 text-white hover:bg-white/10 rounded-full z-[1001] transition md:right-10"
        >
          <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
            <path d="M11 13l5.086 5.086-1.414 1.414L6.758 11.586l7.914-7.914 1.414 1.414L11 11H21v2H11z"/>
          </svg>
        </button>
      )}

      {/* Contador/Info */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-400 text-sm font-medium bg-black/20 px-3 py-1 rounded-full">
        {currentIndex + 1} / {mediaList.length}
      </div>
    </div>
  );
};

export default MediaLightbox;