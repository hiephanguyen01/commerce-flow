import { create } from 'zustand';

type UIState = {
  isNavigationOpen: boolean;
  openNavigation: () => void;
  closeNavigation: () => void;
  toggleNavigation: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  isNavigationOpen: false,

  openNavigation: () => {
    set({ isNavigationOpen: true });
  },

  closeNavigation: () => {
    set({ isNavigationOpen: false });
  },

  toggleNavigation: () => {
    set((state) => ({
      isNavigationOpen: !state.isNavigationOpen,
    }));
  },
}));
