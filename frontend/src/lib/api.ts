import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// 1. Request Interceptor: Attach Token & Context Headers
api.interceptors.request.use((config) => {
  // We access the store directly (outside of React components)
  const state = useAuthStore.getState();
  const token = state.token;
  const sessionId = state.sessionId;
  const companyId = state.activeCompanyId;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId;
  }
  
  if (companyId) {
    config.headers['X-Company-ID'] = companyId.toString();
  }

  return config;
});

// 2. Response Interceptor: Handle 401 (Session Expiry)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Use the store action to cleanup
      useAuthStore.getState().logout();
      
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;