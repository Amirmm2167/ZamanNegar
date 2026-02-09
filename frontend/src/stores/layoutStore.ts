import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ViewMode } from '@/types';

interface LayoutState {
  // Environment
  isMobile: boolean;
  setIsMobile: (val: boolean) => void;

  // Navigation & Date State
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  currentDate: Date; // <--- NEW: Global Date State
  setCurrentDate: (date: Date) => void;

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
  
  // Mobile
  isIslandExpanded: boolean;
  toggleIsland: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      // Defaults
      isMobile: false,
      viewMode: 'month',
      currentDate: new Date(), // Default to today
      isSidebarOpen: true,
      isContextRailOpen: true, 
      selectedEventId: null,
      isIslandExpanded: false,

      // Actions
      setIsMobile: (val) => set({ isMobile: val }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setCurrentDate: (date) => set({ currentDate: date }), // <--- Setter

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
      partialize: (state) => ({ 
        viewMode: state.viewMode, 
        isSidebarOpen: state.isSidebarOpen,
        isContextRailOpen: state.isContextRailOpen,
        // We generally DON'T persist currentDate so user starts on "Today" when they return, 
        // but you can add it here if you want sticky dates.
      }),
    }
  )
);