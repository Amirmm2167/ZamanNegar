import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ViewMode } from '@/types'; // Import from global types

interface LayoutState {
  // Environment
  isMobile: boolean;
  setIsMobile: (val: boolean) => void;

  // Navigation State
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  // Desktop Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setIsSidebarOpen: (isOpen: boolean) => void;
  
  // Context Rail (The right-side details panel)
  isContextRailOpen: boolean;
  toggleContextRail: () => void;
  setIsContextRailOpen: (isOpen: boolean) => void;

  // Event Selection (Drives the Context Rail content)
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
      // Default to 'month' as it's the standard desktop view
      viewMode: 'month', 
      isSidebarOpen: true,
      isContextRailOpen: true, 
      selectedEventId: null,
      isIslandExpanded: false,

      // Actions
      setIsMobile: (val) => set({ isMobile: val }),
      
      setViewMode: (mode) => set({ viewMode: mode }),

      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

      toggleContextRail: () => set((state) => ({ isContextRailOpen: !state.isContextRailOpen })),
      setIsContextRailOpen: (isOpen) => set({ isContextRailOpen: isOpen }),

      setSelectedEventId: (id) => set((state) => ({ 
        selectedEventId: id,
        // Auto-open rail on desktop when an event is selected
        isContextRailOpen: id !== null && !state.isMobile ? true : state.isContextRailOpen
      })),

      toggleIsland: () => set((state) => ({ isIslandExpanded: !state.isIslandExpanded })),
    }),
    {
      name: 'zaman-layout-storage',
      // Persist these fields so the app feels "Native" (remembers state)
      partialize: (state) => ({ 
        viewMode: state.viewMode, 
        isSidebarOpen: state.isSidebarOpen,
        isContextRailOpen: state.isContextRailOpen 
      }),
    }
  )
);