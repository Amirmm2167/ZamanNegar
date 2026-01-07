import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ViewMode } from '@/components/views/shared/ViewSwitcher';

interface LayoutState {
  // Environment
  isMobile: boolean;
  setIsMobile: (val: boolean) => void;

  // Navigation State
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  // Desktop State
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Context Rail (The new Event Details view)
  selectedEventId: number | null;
  setSelectedEventId: (id: number | null) => void;
  
  // Mobile State
  isIslandExpanded: boolean; // For the "Manager Dock" expansion
  toggleIsland: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      isMobile: false, // Will be updated by AppShell
      setIsMobile: (val) => set({ isMobile: val }),

      viewMode: 'week',
      setViewMode: (mode) => set({ viewMode: mode }),

      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      selectedEventId: null,
      setSelectedEventId: (id) => set({ selectedEventId: id }),

      isIslandExpanded: false,
      toggleIsland: () => set((state) => ({ isIslandExpanded: !state.isIslandExpanded })),
    }),
    {
      name: 'zaman-layout-storage', // Persist view preferences
      partialize: (state) => ({ viewMode: state.viewMode, isSidebarOpen: state.isSidebarOpen }),
    }
  )
);