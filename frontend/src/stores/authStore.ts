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
        // If Superadmin and no company selected, return 'superadmin' context
        if (user?.is_superadmin && activeCompanyId === null) return 'superadmin';
        
        if (!activeCompanyId) return null;
        const context = availableContexts.find(c => c.company_id === activeCompanyId);
        return context ? context.role : null;
      },

      login: (data: LoginResponse) => {
        // Auto-select first company IF available. 
        // If not available (Superadmin case), leave as null.
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
            is_superadmin: data.is_superadmin // <--- Use value from response
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
        const { availableContexts } = get();
        if (availableContexts.some(c => c.company_id === companyId)) {
          set({ activeCompanyId: companyId });
          window.location.reload();
        }
      },

      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'zaman-auth-storage',
    }
  )
);