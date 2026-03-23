import axios from 'axios';
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

console.log('[AXIOS] baseURL:', api.defaults.baseURL);

// Variáveis para controle do Refresh Token
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// --- INTERCEPTOR DE REQUISIÇÃO ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access');
  // Evita enviar strings "null" ou "undefined" literais
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- INTERCEPTOR DE RESPOSTA (Silent Refresh & Erros) ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 1. Trata Usuário Banido (403)
    if (error.response?.status === 403 && error.response.data?.ban_reason) {
      toast.error(`Acesso negado: ${error.response.data.ban_reason}`, {
        toastId: 'ban-toast',
      });
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      // Opcional: window.location.href = '/login';
      return Promise.reject(error);
    }

    // 2. Trata Token Expirado (401) e tenta Refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Se já houver um refresh em curso, coloca esta requisição na fila
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refresh');

      // Se não houver refresh token disponível, desloga
      if (
        !refreshToken ||
        refreshToken === 'null' ||
        refreshToken === 'undefined'
      ) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        // Redireciona se necessário: window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Chamada direta ao axios para evitar interceptores de loop
        const response = await axios.post(
          `${api.defaults.baseURL}/token/refresh/`,
          {
            refresh: refreshToken,
          }
        );

        const { access, refresh: newRefresh } = response.data;

        localStorage.setItem('access', access);
        // Se o Django estiver com ROTATE_REFRESH_TOKENS = True, ele envia um novo refresh
        if (newRefresh) {
          localStorage.setItem('refresh', newRefresh);
        }

        // Atualiza a requisição original e a fila
        api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        originalRequest.headers.Authorization = `Bearer ${access}`;

        processQueue(null, access);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        // window.location.href = '/login?session=expired';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// --- MÉTODOS DE API ---

export const profileAPI = {
  getMe: () => api.get('/accounts/profile/'),
  updateMe: (data) => api.patch('/accounts/profile/', data),
};

export const postsAPI = {
  create: (formData) => api.post('/posts/', formData),
  list: () => api.get('/posts/'),
  update: (id, formData) =>
    api.patch(`/posts/${id}/`, formData, {
      headers: { 'Content-Type': undefined },
    }),
  delete: (id) => api.delete(`/posts/${id}/`),
  getFeed: (urlOrPage = '/accounts/feed/') => {
    const endpoint =
      typeof urlOrPage === 'number'
        ? `/accounts/feed/?page=${urlOrPage}`
        : urlOrPage;
    return api.get(endpoint);
  },
};

export default api;
