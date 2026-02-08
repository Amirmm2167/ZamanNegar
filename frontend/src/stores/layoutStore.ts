import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// Ensure this path matches where your ViewMode type is defined
// If ViewMode is not exported from ViewSwitcher, define it here or in types/index.ts
export type ViewMode = 'day' | '3day' | 'week' | 'month' | 'year' | 'agenda';

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
  setIsSidebarOpen: (isOpen: boolean) => void; // <--- Fixed: Added missing setter
  
  // Context Rail (The right-side details panel)
  isContextRailOpen: boolean; // <--- Fixed: Added missing state
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
      viewMode: 'week',
      isSidebarOpen: true,
      isContextRailOpen: true, // Default to open on desktop
      selectedEventId: null,
      isIslandExpanded: false,

      // Actions
      setIsMobile: (val) => set({ isMobile: val }),
      
      setViewMode: (mode) => set({ viewMode: mode }),

      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setIsSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }), // <--- Implementation

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
      // Persist user preferences (ViewMode, Sidebar state, Rail state)
      partialize: (state) => ({ 
        viewMode: state.viewMode, 
        isSidebarOpen: state.isSidebarOpen,
        isContextRailOpen: state.isContextRailOpen 
      }),
    }
  )
);