import api from './axios'; // O seu arquivo que tem o axios.create

export const googleLoginApi = (accessToken) => {
  // Usamos a URL completa para não ter erro com a baseURL do seu axios
  return api.post('/accounts/google-login/', {
    access_token: accessToken,
  });
};