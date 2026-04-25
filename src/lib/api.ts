import axios from 'axios';

// Use relative URLs — Vite proxies them to the correct backend
// This completely eliminates CORS issues
export const laravelApi = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

export const ocrApi = axios.create({
  baseURL: '/api/ocr',
  timeout: 90000,
});

// Attach token on every Laravel request
laravelApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Only redirect on 401 if we had a token
laravelApi.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('auth_token')) {
      localStorage.removeItem('auth_token');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);
