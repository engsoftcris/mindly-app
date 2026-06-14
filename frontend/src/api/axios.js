import axios from 'axios';
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

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

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access');
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 403 && error.response.data?.ban_reason) {
      toast.error(`Acesso negado: ${error.response.data.ban_reason}`, {
        toastId: 'ban-toast',
      });
      localStorage.removeItem('access');
      localStorage.removeItem('refresh');
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
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

      if (
        !refreshToken ||
        refreshToken === 'null' ||
        refreshToken === 'undefined'
      ) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${api.defaults.baseURL}/token/refresh/`,
          {
            refresh: refreshToken,
          }
        );

        const { access, refresh: newRefresh } = response.data;

        localStorage.setItem('access', access);
        if (newRefresh) {
          localStorage.setItem('refresh', newRefresh);
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
        originalRequest.headers.Authorization = `Bearer ${access}`;

        processQueue(null, access);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
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
