import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, CompanyProfile, LoginResponse } from '@/types';

interface AuthState {
  token: string | null;
  sessionId: string | null;
  user: User | null;
  
  activeCompanyId: number | null;
  availableContexts: CompanyProfile[];
  
  currentRole: () => string | null;
  
  login: (data: LoginResponse) => void;
  logout: () => void;
  switchCompany: (companyId: number) => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      sessionId: null,
      user: null,
      activeCompanyId: null,
      availableContexts: [],

      currentRole: () => {
        const { activeCompanyId, availableContexts, user } = get();
        if (user?.is_superadmin) {
             // If Admin is viewing a specific company, they are a "Manager" of it
             if (activeCompanyId) return 'manager';
             return 'superadmin';
        }
        
        if (!activeCompanyId) return null;
        const context = availableContexts.find(c => c.company_id === activeCompanyId);
        return context ? context.role : null;
      },

      login: (data: LoginResponse) => {
        const defaultCompanyId = data.available_contexts.length > 0 
          ? data.available_contexts[0].company_id 
          : null;

        set({
          token: data.access_token,
          sessionId: data.session_id,
          user: { 
            id: 0, 
            username: data.username,
            display_name: data.username, 
            is_superadmin: data.is_superadmin
          },
          availableContexts: data.available_contexts,
          activeCompanyId: defaultCompanyId,
        });
      },

      logout: () => {
        set({
          token: null,
          sessionId: null,
          user: null,
          activeCompanyId: null,
          availableContexts: []
        });
        localStorage.clear();
      },

      switchCompany: (companyId: number) => {
        const { availableContexts, user } = get();
        
        // Allow if user is Superadmin OR if they have the profile
        if (user?.is_superadmin || availableContexts.some(c => c.company_id === companyId)) {
          set({ activeCompanyId: companyId });
          // Force reload to clear React Query caches
          setTimeout(() => window.location.reload(), 50); 
        }
      },

      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'zaman-auth-storage',
    }
  )
);