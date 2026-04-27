import axios from 'axios';
import { config } from '../config';

export const api = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

// Keep laravelApi as alias for backward compatibility
export const laravelApi = api;

export const ocrApi = axios.create({
  baseURL: config.api.ocrUrl,
  timeout: config.api.ocrTimeout,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('auth_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('auth_token')) {
      localStorage.removeItem('auth_token');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);
