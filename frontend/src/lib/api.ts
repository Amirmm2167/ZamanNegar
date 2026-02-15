import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: baseURL,
  headers: { 'Content-Type': 'application/json' },
});

// 1. Request Interceptor: Injects dynamic auth data from the store
api.interceptors.request.use((config) => {
  // Get current state from Zustand (works inside or outside React)
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
  
  // Only add Company ID header if it exists
  if (companyId !== null && companyId !== undefined) {
    config.headers['X-Company-ID'] = companyId.toString();
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// 2. Response Interceptor: Handles expired tokens and unauthorized access
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Logic Check: Don't logout if the failed request was an optional check (like analytics)
      const isAnalytics = error.config?.url?.includes('/analytics');
      if (isAnalytics) {
         return Promise.reject(error);
      }

      // If unauthorized, clear state and redirect to login
      const logout = useAuthStore.getState().logout;
      logout();

      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;