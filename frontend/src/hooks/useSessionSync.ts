import { useEffect } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export function useSessionSync() {
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) return;

    const validateSession = async () => {
      try {
        // This endpoint returns the REAL user data from the DB
        const { data } = await api.get('/auth/me'); 
        
        // We update the store with the trusted data from the server
        // You might need to adjust 'login' to accept partial updates or create a 'updateUser' action
        useAuthStore.setState(state => ({
            ...state,
            user: { 
                ...state.user!, 
                is_superadmin: data.is_superadmin, // <--- Overwrite local lies
                username: data.username
            }
        }));
      } catch (error) {
        // If server says token is invalid, log them out immediately
        logout();
      }
    };

    validateSession();
  }, [token, logout]);
}