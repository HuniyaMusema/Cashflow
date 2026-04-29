import axios from 'axios';
import { config } from '../config';

// In production (Render), VITE_API_URL points to the deployed API.
// In dev, we use relative URLs so Vite proxy handles them (no CORS).
const isProduction = import.meta.env.PROD;

const apiBase = isProduction
  ? (import.meta.env.VITE_API_URL || 'https://cashflow-api.onrender.com/api/v1')
  : '/api/v1';

const ocrBase = isProduction
  ? (import.meta.env.VITE_OCR_URL || 'https://cashflow-ocr.onrender.com/api/ocr')
  : '/api/ocr';

export const api = axios.create({
  baseURL: apiBase,
  timeout: config.api.timeout,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
});

export const laravelApi = api; // backward compat alias

export const ocrApi = axios.create({
  baseURL: ocrBase,
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
