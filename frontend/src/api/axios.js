import axios from 'axios';
import { toast } from 'react-toastify'; // 1. Importa o toast

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

console.log('[AXIOS] baseURL:', api.defaults.baseURL);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access');
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 🛡️ 2. Adiciona o interceptor de resposta para mostrar o Toast
api.interceptors.response.use(
  (response) => response, 
  (error) => {
    // Se a API retornar 403 e tiver o nosso motivo de banimento
    if (error.response?.status === 403 && error.response.data?.ban_reason) {
      toast.error(`Acesso negado: ${error.response.data.ban_reason}`, {
        toastId: 'ban-toast', // Evita que apareçam vários toasts iguais
      });
      
      // Limpamos o localStorage para garantir que os PrivateRoutes 
      // detectem a perda de acesso e redirecionem
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
    }
    return Promise.reject(error);
  }
);

export const profileAPI = {
  getMe: () => api.get('/accounts/profile/'),
  updateMe: (data) => api.patch('/accounts/profile/', data),
};

export const postsAPI = {
  create: (data) => api.post('/posts/', data),
  list: () => api.get('/posts/'),
  // Ajuste aqui: forçamos o Content-Type para JSON
  update: (id, formData) => api.patch(`/posts/${id}/`, formData, {
    headers: {
      // Deixamos o navegador definir o boundary do Multipart automaticamente
      'Content-Type': 'multipart/form-data',
    }
  }),
  delete: (id) => api.delete(`/posts/${id}/`),
  getFeed: (urlOrPage = '/accounts/feed/') => {
    const endpoint = typeof urlOrPage === 'number' 
      ? `/accounts/feed/?page=${urlOrPage}` 
      : urlOrPage;
    return api.get(endpoint);
  },
};

export default api;