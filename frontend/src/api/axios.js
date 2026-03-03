import axios from 'axios';
import { toast } from 'react-toastify';

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

// Interceptor de resposta para mostrar Toast
api.interceptors.response.use(
  (response) => response, 
  (error) => {
    if (error.response?.status === 403 && error.response.data?.ban_reason) {
      toast.error(`Acesso negado: ${error.response.data.ban_reason}`, {
        toastId: 'ban-toast',
      });
      
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
  create: (formData) => api.post('/posts/', formData), 
  list: () => api.get('/posts/'),
  update: (id, formData) => api.patch(`/posts/${id}/`, formData, {
    headers: { 'Content-Type': undefined }
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