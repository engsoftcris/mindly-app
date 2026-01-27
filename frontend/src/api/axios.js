import axios from 'axios';

const api = axios.create({
  // URL base para não precisares de repetir em cada chamada
  baseURL: 'http://localhost:8000/api',
});

// Este interceptor vai anexar o Token JWT automaticamente em cada pedido
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;