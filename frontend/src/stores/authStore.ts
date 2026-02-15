import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, CompanyProfile, LoginResponse } from '@/types';
import api from '@/lib/api';
import { cookieStorage } from '@/lib/storage';

interface AuthState {
  token: string | null;
  sessionId: string | null;
  user: User | null;
  activeCompanyId: number | null;
  availableContexts: CompanyProfile[];

  isHydrated: boolean;
  isInitialized: boolean;
  isSynced: boolean;

  login: (data: LoginResponse) => void;
  logout: () => void;
  fetchSession: () => Promise<void>;
  switchCompany: (companyId: number) => void;
  setHydrated: () => void;
  initialize: () => Promise<void>;

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
      isInitialized: false,
      isSynced: false,

      login: (data: LoginResponse) => {
        const defaultCompanyId = data.available_contexts?.length > 0
          ? data.available_contexts[0].company_id
          : null;

        set({
          token: data.access_token,
          sessionId: data.session_id,
          user: {
            id: 0, // ID will be updated on next fetchSession/initialize if needed, or decoded
            username: data.username,
            display_name: data.username,
            is_superadmin: data.is_superadmin
          },
          availableContexts: data.available_contexts || [],
          activeCompanyId: defaultCompanyId,
          isSynced: true,
          isInitialized: true
        });
      },

      logout: () => {
        set({
          token: null,
          sessionId: null,
          user: null,
          activeCompanyId: null,
          availableContexts: [],
          isSynced: false,
          isInitialized: true
        });
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },

      fetchSession: async () => {
        await get().initialize();
      },

      initialize: async () => {
        const state = get();
        const token = state.token;

        if (!token) {
          set({ isInitialized: true });
          return;
        }

        try {
          // FIX: We only need /auth/me because it contains the 'available_contexts' with ROLES.
          // /companies/me only returns the company list without roles.
          const userRes = await api.get('/auth/me');
          
          const userData = userRes.data;
          // Extract contexts from the /me response, NOT /companies/me
          // @ts-ignore - The API response has available_contexts, even if User type doesn't explicitly list it
          const freshContexts: CompanyProfile[] = userData.available_contexts || [];

          // Validate if the currently active company is still valid
          const currentActiveId = state.activeCompanyId;
          const isStillValid = freshContexts.find(c => c.company_id === currentActiveId);

          let nextActiveId = currentActiveId;
          if (!isStillValid) {
             nextActiveId = freshContexts.length > 0 ? freshContexts[0].company_id : null;
          }

          set({
            user: {
                id: userData.id,
                username: userData.username,
                display_name: userData.display_name,
                is_superadmin: userData.is_superadmin
            },
            availableContexts: freshContexts, // <--- THIS WAS THE FIX
            activeCompanyId: nextActiveId,
            isSynced: true,
            isInitialized: true
          });

        } catch (error: any) {
          console.error("Session restore failed", error);
          if (error.response?.status === 401) {
            get().logout();
          }
        } finally {
          set({ isInitialized: true });
        }
      },

      switchCompany: (companyId: number) => {
        const { availableContexts, user } = get();
        // Allow switch if superadmin or if user belongs to that company
        const hasAccess = user?.is_superadmin || availableContexts.some(c => c.company_id === companyId);
        
        if (hasAccess) {
          set({ activeCompanyId: companyId });
        }
      },

      setHydrated: () => set({ isHydrated: true }),

      isAuthenticated: () => !!get().token,

      currentRole: () => {
        const state = get();

        // 1. Superadmin takes precedence
        if (state.user?.is_superadmin) return 'superadmin';

        // 2. Check current context
        if (state.activeCompanyId !== null && state.availableContexts?.length > 0) {
          const context = state.availableContexts.find(
            (c) => Number(c.company_id) === Number(state.activeCompanyId)
          );
          if (context) return context.role;
        }

        // 3. Fallback
        return state.token ? 'authenticated' : 'viewer';
      },
    }),
    {
      name: 'zaman-auth-cookie',
      storage: createJSONStorage(() => cookieStorage),
      partialize: (state) => ({
        token: state.token,
        sessionId: state.sessionId,
        activeCompanyId: state.activeCompanyId,
        user: state.user,
        availableContexts: state.availableContexts, 
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);