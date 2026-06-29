import { create } from 'zustand';
import type { Folder } from '../types';
import * as api from '../lib/api';

/** Special sentinel values for activeFolder */
export const ALL_NOTES = '__all__';
export const TRASH = '__trash__';

interface FoldersState {
  folders: Folder[];
  activeFolder: string;
  loading: boolean;

  fetchFolders: () => Promise<void>;
  setActiveFolder: (name: string) => void;
  createFolder: (name: string) => Promise<void>;
  renameFolder: (oldName: string, newName: string) => Promise<void>;
  deleteFolder: (name: string) => Promise<void>;
}

export const useFoldersStore = create<FoldersState>((set, get) => ({
  folders: [],
  activeFolder: ALL_NOTES,
  loading: false,

  fetchFolders: async () => {
    set({ loading: true });
    try {
      const folders = await api.listFolders();
      folders.sort((a, b) => a.name.localeCompare(b.name));
      set({ folders, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setActiveFolder: (name: string) => {
    set({ activeFolder: name });
  },

  createFolder: async (name: string) => {
    await api.createFolder(name);
    await get().fetchFolders();
  },

  renameFolder: async (oldName: string, newName: string) => {
    await api.renameFolder(oldName, newName);
    const state = get();
    if (state.activeFolder === oldName) {
      set({ activeFolder: newName });
    }
    await state.fetchFolders();
  },

  deleteFolder: async (name: string) => {
    await api.deleteFolder(name);
    const state = get();
    if (state.activeFolder === name) {
      set({ activeFolder: ALL_NOTES });
    }
    await state.fetchFolders();
  },
}));
