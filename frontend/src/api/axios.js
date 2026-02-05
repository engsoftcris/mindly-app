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

export const postsAPI = {
  // We add 'accounts' here because your Django config forces it
  create: (data) => api.post('/accounts/posts/', data),
  list: () => api.get('/accounts/posts/'),
  // ... update the others too
  feed: (page = 1) => api.get(`/accounts/feed/?page=${page}`),
};

export default api;