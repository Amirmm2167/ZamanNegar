import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, CompanyProfile, LoginResponse } from '@/types';
import api from '@/lib/api';

interface AuthState {
  token: string | null;
  sessionId: string | null;
  user: User | null;
  activeCompanyId: number | null;
  availableContexts: CompanyProfile[];

  isHydrated: boolean;
  isSynced: boolean;

  login: (data: LoginResponse) => void;
  logout: () => void;
  fetchSession: () => Promise<void>;
  switchCompany: (companyId: number) => void;
  setHydrated: () => void;

  isAuthenticated: () => boolean;
  currentRole: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      sessionId: null,
      user: null,
      activeCompanyId: null,
      availableContexts: [],

      isHydrated: false,
      isSynced: false,

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
          isSynced: true
        });
      },

      logout: () => {
        set({
          token: null,
          sessionId: null,
          user: null,
          activeCompanyId: null,
          availableContexts: [],
          isSynced: false
        });
        localStorage.removeItem('zaman-auth-storage');
        // REMOVED: window.location.href = '/login'; 
        // We let the AppShell detect the state change and redirect naturally.
      },

      fetchSession: async () => {
        const { token } = get();
        if (!token) return;

        try {
          const { data } = await api.get('/auth/me');

          set({
            user: {
              id: data.id,
              username: data.username,
              display_name: data.display_name,
              is_superadmin: data.is_superadmin
            },
            availableContexts: data.available_contexts || [],
            isSynced: true
          });
        } catch (error) {
          console.error("Session sync failed", error);
          get().logout();
        }
      },

      switchCompany: (companyId: number) => {
        const { availableContexts, user } = get();
        if (user?.is_superadmin || availableContexts.some(c => c.company_id === companyId)) {
          set({ activeCompanyId: companyId });
          // REMOVED: window.location.reload(); 
          // React will automatically re-render components dependent on companyId.
        }
      },

      setHydrated: () => set({ isHydrated: true }),

      isAuthenticated: () => !!get().token,

      // In authStore.ts
      currentRole: () => {
        const state = get();
        // 1. Check if user is superadmin
        if (state.user?.is_superadmin) return 'superadmin';

        // 2. Check active company context
        if (state.activeCompanyId) {
          const context = state.availableContexts.find(c => c.company_id === state.activeCompanyId);
          if (context) return context.role; // 'manager' | 'evaluator' | 'viewer'
        }

        // 3. Fallback
        return 'viewer';
      },
    }),
    {
      name: 'zaman-auth-storage',
      partialize: (state) => ({
        token: state.token,
        sessionId: state.sessionId,
        activeCompanyId: state.activeCompanyId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);