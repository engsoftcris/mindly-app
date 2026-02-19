import React, { useState, useEffect } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';

const GIPHY_API_KEY = "QYGuyFwFjGPQFKrAcwJLuQ8LINIF7RbP";

const GiftSelector = ({ onSelect, onClose, setCanUseGifs }) => {
    const [gifs, setGifs] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchGifs = async (query = "") => {
        if (!GIPHY_API_KEY) return;

        setLoading(true);
        try {
            const url = query 
                ? `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=12&rating=g`
                : `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=12&rating=g`;
            
            const response = await fetch(url);

            if (response.status === 429 || response.status === 403) {
                console.error("Cota do Giphy esgotada ou erro de permissão.");
                if (setCanUseGifs) setCanUseGifs(false);
                onClose();
                return;
            }

            const result = await response.json();
            if (result.data) {
                setGifs(result.data);
            }
        } catch (error) {
            console.error("Erro na requisição:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGifs();
    }, []);

    return (
        <div 
            data-cy="gif-selector-overlay"
            className="fixed inset-0 z-[10001] pointer-events-none"
        >
            <div 
                data-cy="gif-selector"
                className="pointer-events-auto absolute left-1/2 top-1/2 transform -translate-x-[280px] -translate-y-[110%] w-80 h-[400px] bg-[#15181c] border border-gray-800 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
            >
                
                {/* Header */}
                <div className="flex-none p-3 border-b border-gray-800 flex items-center gap-2 bg-[#15181c]">
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={12} />
                        <input 
                            data-cy="gif-search-input"
                            type="text"
                            placeholder="Search GIPHY"
                            autoFocus
                            className="bg-black border border-gray-700 focus:border-blue-500 focus:ring-0 text-sm text-white w-full rounded-full pl-9 pr-4 py-1.5"
                            onChange={(e) => fetchGifs(e.target.value)}
                        />
                    </div>

                    <button 
                        data-cy="gif-close-btn"
                        onClick={onClose} 
                        className="text-gray-400 hover:text-white p-1.5 rounded-full transition"
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {/* Grid */}
                <div 
                    data-cy="gif-grid"
                    className="flex-1 overflow-y-auto p-2 grid grid-cols-2 gap-2 custom-scrollbar bg-black/40"
                >
                    {loading && gifs.length === 0 ? (
                        <div 
                            data-cy="gif-loading"
                            className="col-span-2 flex flex-col items-center justify-center py-24 gap-2"
                        >
                            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        gifs.map((gif) => (
                            <div 
                                key={gif.id}
                                data-cy="gif-item"
                                data-gif-id={gif.id}
                                data-gif-url={gif.images.fixed_height.url}
                                className="h-28 bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all active:scale-95"
                                onClick={() => onSelect(gif.images.fixed_height.url)}
                            >
                                <img 
                                    data-cy="gif-image"
                                    src={gif.images.fixed_height_small.url} 
                                    alt={gif.title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="flex-none bg-black py-1.5 border-t border-gray-800 text-center">
                    <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                        Powered by GIPHY
                    </span>
                </div>

            </div>
        </div>
    );
};

export default GiftSelector;
