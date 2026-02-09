import { create } from 'zustand';

type MenuType = 'empty-slot' | 'event';

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  type: MenuType | null;
  data: any | null; // Holds the Event ID or Date/Time slot data
  
  openMenu: (e: React.MouseEvent, type: MenuType, data: any) => void;
  closeMenu: () => void;
}

export const useContextMenuStore = create<ContextMenuState>((set) => ({
  isOpen: false,
  position: { x: 0, y: 0 },
  type: null,
  data: null,

  openMenu: (e, type, data) => {
    e.preventDefault(); // Stop browser native menu
    e.stopPropagation();
    set({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      type,
      data,
    });
  },

  closeMenu: () => set({ isOpen: false, type: null, data: null }),
}));