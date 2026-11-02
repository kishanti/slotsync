import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

// attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// if access token expired, try refresh once
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const newToken = res.data.data.accessToken;
        localStorage.setItem('token', newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

export default api;
