import axios from 'axios';

const api = axios.create({
  // Se existir VITE_API_URL no ambiente, usa ela. Senão, usa localhost.
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

// Este interceptor vai anexar o Token JWT automaticamente em cada pedido
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access');
  // Só adiciona o header se o token REALMENTE existir
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;