import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, CompanyProfile, LoginResponse } from '@/types';

interface AuthState {
  // State
  token: string | null;
  sessionId: string | null;
  user: User | null;
  
  // Context State
  activeCompanyId: number | null;
  availableContexts: CompanyProfile[];
  
  // Computed
  currentRole: () => string | null;
  
  // Actions
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
        const { activeCompanyId, availableContexts } = get();
        if (!activeCompanyId) return null;
        const context = availableContexts.find(c => c.company_id === activeCompanyId);
        return context ? context.role : null;
      },

      login: (data: LoginResponse) => {
        // Auto-select the first company if available
        const defaultCompanyId = data.available_contexts.length > 0 
          ? data.available_contexts[0].company_id 
          : null;

        set({
          token: data.access_token,
          sessionId: data.session_id,
          user: { 
            id: 0, // We'll fetch the real ID via /auth/me later if needed
            username: data.username,
            display_name: data.username, // Placeholder
            is_superadmin: false // Placeholder
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
        localStorage.clear(); // Clear other stores if needed
      },

      switchCompany: (companyId: number) => {
        const { availableContexts } = get();
        if (availableContexts.some(c => c.company_id === companyId)) {
          set({ activeCompanyId: companyId });
          // Optional: Reload page to ensure clean state
          window.location.reload();
        }
      },

      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'zaman-auth-storage', // Key in localStorage
    }
  )
);