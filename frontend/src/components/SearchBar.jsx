import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import api  from '../api/axios';
import { Link } from 'react-router-dom';

const SearchBar = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length > 2) {
                try {
                    const response = await api.get(`/accounts/search/?q=${searchTerm}`);
                    setResults(response.data.results || response.data);
                    setIsDropdownOpen(true);
                } catch (err) {
                    console.error("Erro na busca", err);
                }
            } else {
                setResults([]);
                setIsDropdownOpen(false);
            }
        }, 300); // Espera 300ms após o usuário parar de digitar

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    return (
        <div className="relative w-full mb-4 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-[#1d9bf0]">
                <Search size={18} />
            </div>
            <input
                data-cy="search-input"
                type="text"
                className="block w-full bg-[#202327] border-none rounded-full py-2.5 pl-12 pr-4 text-white placeholder-gray-500 focus:ring-1 focus:ring-[#1d9bf0] focus:bg-black text-[15px] outline-none transition-all"
                placeholder="Buscar no Mindly"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)} // Delay para permitir o clique no link
            />

          {/* Dropdown de Resultados */}
{isDropdownOpen && results.length > 0 && (
    <div className="absolute top-full left-0 w-full bg-black border border-gray-800 rounded-xl mt-1 shadow-2xl z-50 max-h-80 overflow-y-auto">
        {results.map((profile) => {
            // Tenta pegar o username do objeto 'user' ou da raiz
            const username = profile.user?.username || profile.username || "usuario";
            // Tenta pegar o nome completo
            const fullName = profile.user?.full_name || profile.full_name || username;
            // Tenta pegar a foto
            const avatarUrl = profile.avatar || profile.profile_picture || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png';
            const finalAvatar = avatarUrl.startsWith('http') ? avatarUrl : `http://localhost:8000${avatarUrl}`;

            return (
                <Link 
                    data-cy="search-result-item"
                    key={profile.id} 
                    to={`/profile/${profile.id}`}
                    onMouseDown={(e) => e.preventDefault()} // Evita que o onBlur feche antes do clique
                    className="flex items-center gap-3 p-3 hover:bg-[#16181C] transition border-b border-gray-900 last:border-0"
                >
                    <img 
                        src={finalAvatar} 
                        className="w-10 h-10 rounded-full object-cover border border-gray-800"
                        alt={username}
                        onError={(e) => { e.target.src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png'; }}
                    />
                    <div className="flex flex-col min-w-0">
                        <span data-cy="search-result-name" className="text-white font-bold text-[15px] truncate leading-tight">
                            {fullName}
                        </span>
                        <span data-cy="search-result-username" className="text-gray-500 text-sm truncate">
                            @{username}
                        </span>
                    </div>
                </Link>
            );
        })}
    </div>
)}
        </div>
    );
};

export default SearchBar;