import axios from 'axios';

const api = axios.create({
  // Se existir VITE_API_URL no ambiente, usa ela. Senão, usa localhost.
  baseURL: import.meta.env.VITE_API_URL,
});
// 🔎 LOG CRÍTICO
console.log('[AXIOS] baseURL:', api.defaults.baseURL);
console.log('[AXIOS] VITE_API_URL:', import.meta.env.VITE_API_URL);


// Este interceptor vai anexar o Token JWT automaticamente em cada pedido
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access');
  // Só adiciona o header se o token REALMENTE existir
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const profileAPI = {
  // GET /api/accounts/profile/me/
  getMe: () => api.get('/accounts/profile/me/'),
  
  // PATCH /api/accounts/profile/me/
  updateMe: (data) => api.patch('/accounts/profile/me/', data),
};
export const postsAPI = {
  // REMOVEMOS o 'accounts' porque o router está na raiz da /api/
  create: (data) => api.post('/posts/', data),
  
  list: () => api.get('/posts/'),

  getFeed: (urlOrPage = '/accounts/feed/') => {
    // O feed continua em /accounts/ porque está no accounts/urls.py
    const endpoint = typeof urlOrPage === 'number' 
      ? `/accounts/feed/?page=${urlOrPage}` 
      : urlOrPage;
      
    return api.get(endpoint);
  },
};

export default api;