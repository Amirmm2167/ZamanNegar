import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// FIX: Added 'mobile-week' to the type definition so ViewSwitcher works correctly
export type ViewMode = 'day' | '3day' | 'week' | 'month' | 'year' | 'agenda' | 'mobile-week';

interface LayoutState {
  // Environment
  isMobile: boolean;
  setIsMobile: (val: boolean) => void;

  // Navigation State
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Time State
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  jumpToToday: () => void;
  
  // Desktop Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  
  // Context Rail
  isContextRailOpen: boolean;
  toggleContextRail: () => void;
  setIsContextRailOpen: (isOpen: boolean) => void;

  // Event Selection
  selectedEventId: number | null;
  setSelectedEventId: (id: number | null) => void;
  
  // Mobile Floating Island
  isIslandExpanded: boolean;
  toggleIsland: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      // Defaults
      isMobile: false,
      viewMode: 'week',
      
      // Time Defaults
      currentDate: new Date(), 
      
      isSidebarOpen: true,
      isContextRailOpen: true,
      selectedEventId: null,
      isIslandExpanded: false,

      // Actions
      setIsMobile: (val) => set({ isMobile: val }),
      
      setViewMode: (mode) => set({ viewMode: mode }),

      // Time Actions
      setCurrentDate: (date) => set({ currentDate: date }),
      jumpToToday: () => set({ currentDate: new Date() }),

      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

      toggleContextRail: () => set((state) => ({ isContextRailOpen: !state.isContextRailOpen })),
      setIsContextRailOpen: (isOpen) => set({ isContextRailOpen: isOpen }),

      setSelectedEventId: (id) => set((state) => ({ 
        selectedEventId: id,
        isContextRailOpen: id !== null && !state.isMobile ? true : state.isContextRailOpen
      })),

      toggleIsland: () => set((state) => ({ isIslandExpanded: !state.isIslandExpanded })),
    }),
    {
      name: 'zaman-layout-storage',
      // Persist these fields
      partialize: (state) => ({ 
        viewMode: state.viewMode, 
        isSidebarOpen: state.isSidebarOpen,
        isContextRailOpen: state.isContextRailOpen,
        currentDate: state.currentDate, 
      }),
      // Custom storage to handle Date object hydration
      storage: createJSONStorage(() => localStorage, {
        reviver: (key, value) => {
          if (key === 'currentDate') {
            return new Date(value as string);
          }
          return value;
        },
      }),
    }
  )
);