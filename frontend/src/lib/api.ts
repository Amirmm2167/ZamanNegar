import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'|| '0.0.0.0:8000'|| '192.168.1.31:8000';

const api = axios.create({
  baseURL: baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// 1. Request Interceptor: Attach Token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 2. Response Interceptor: Handle Session Expiry (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear session and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('username');
        // Prevent infinite loop if already on login
        if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;