import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, CompanyProfile, LoginResponse } from '@/types';
import api from '@/lib/api';
import { cookieStorage } from '@/lib/storage'; // <--- Import Adapter

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
        // Cookies.remove happens automatically via persist logic on next state change,
        // but forcing a reload ensures clean slate.
        window.location.href = '/login';
      },

      fetchSession: async () => {
        await get().initialize();
      },

      initialize: async () => {
        const token = get().token;
        if (!token) {
          set({ isInitialized: true, availableContexts: [] });
          return;
        }

        try {
          // Fetch fresh data
          const [userRes, contextRes] = await Promise.all([
            api.get('/auth/me'),
            api.get('/companies/me')
          ]);

          set({
            user: userRes.data,
            availableContexts: contextRes.data || [],
            isSynced: true
          });

          // Validate Active Context
          const currentId = get().activeCompanyId;
          const isValid = (contextRes.data || []).find((c: any) => c.company_id === currentId);

          if (!isValid) {
            if (contextRes.data && contextRes.data.length > 0) {
              set({ activeCompanyId: contextRes.data[0].company_id });
            } else {
              set({ activeCompanyId: null });
            }
          }

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
        if (user?.is_superadmin || availableContexts.some(c => c.company_id === companyId)) {
          set({ activeCompanyId: companyId });
        }
      },

      setHydrated: () => set({ isHydrated: true }),

      isAuthenticated: () => !!get().token,

      currentRole: () => {
        const state = get();

        // 1. Check Superadmin first (this comes from the login response/cookie)
        if (state.user?.is_superadmin) return 'superadmin';

        // 2. Check active company context
        if (state.activeCompanyId && state.availableContexts?.length > 0) {
          const context = state.availableContexts.find(
            (c) => Number(c.company_id) === Number(state.activeCompanyId)
          );
          if (context) return context.role;
        }

        // 3. Fallback during initialization
        return state.token ? 'authenticated' : 'viewer';
      },
    }),
    {
      name: 'zaman-auth-cookie', // New name to avoid localStorage conflicts
      storage: createJSONStorage(() => cookieStorage), // <--- USE COOKIE STORAGE
      partialize: (state) => ({
        token: state.token,
        sessionId: state.sessionId,
        activeCompanyId: state.activeCompanyId,
        user: state.user,
        availableContexts: state.availableContexts, // Critical for immediate role resolution
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);