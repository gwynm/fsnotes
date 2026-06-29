import { create } from 'zustand';

interface UiState {
  sidebarVisible: boolean;
  mode: 'edit' | 'preview';
  /** Mobile navigation state: which pane is visible */
  mobilePane: 'sidebar' | 'list' | 'editor';
  toggleSidebar: () => void;
  setMode: (m: 'edit' | 'preview') => void;
  setMobilePane: (pane: 'sidebar' | 'list' | 'editor') => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarVisible: true,
  mode: 'edit',
  mobilePane: 'sidebar',

  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),

  setMode: (mode) => set({ mode }),

  setMobilePane: (mobilePane) => set({ mobilePane }),
}));
