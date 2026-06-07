import { create } from 'zustand';
import type { Note } from '../types';
import * as api from '../lib/api';
import { ALL_NOTES, TRASH } from './folders';

type SortBy = 'modified' | 'created' | 'title';
type SortDir = 'asc' | 'desc';

interface NotesState {
  notes: Note[];
  selectedNote: Note | null;
  loading: boolean;
  searchQuery: string;
  sortBy: SortBy;
  sortDir: SortDir;

  fetchNotes: (folder?: string, search?: string) => Promise<void>;
  selectNote: (path: string | null) => Promise<void>;
  createNote: (folder: string, filename: string, content: string) => Promise<Note>;
  updateNote: (path: string, content: string) => Promise<void>;
  deleteNote: (path: string, permanent?: boolean) => Promise<void>;
  renameNote: (path: string, newFilename: string) => Promise<void>;
  moveNote: (path: string, newFolder: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: SortBy) => void;
  toggleSortDir: () => void;
  clearSelection: () => void;
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  selectedNote: null,
  loading: false,
  searchQuery: '',
  sortBy: 'modified',
  sortDir: 'desc',

  fetchNotes: async (folder?: string, search?: string) => {
    set({ loading: true });
    try {
      const { sortBy, sortDir } = get();
      const sortParam =
        sortBy === 'modified' ? 'modified' : sortBy === 'created' ? 'created' : 'title';

      const params: Parameters<typeof api.listNotes>[0] = {
        sort: sortParam,
        dir: sortDir,
      };

      if (search) {
        params.search = search;
      } else if (folder === TRASH) {
        params.trash = true;
      } else if (folder && folder !== ALL_NOTES) {
        params.folder = folder;
      }

      const notes = await api.listNotes(params);
      set({ notes, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  selectNote: async (path: string | null) => {
    if (!path) {
      set({ selectedNote: null });
      return;
    }
    try {
      const note = await api.getNote(path);
      set({ selectedNote: note });
    } catch {
      set({ selectedNote: null });
    }
  },

  createNote: async (folder: string, filename: string, content: string) => {
    const note = await api.createNote({ folder, filename, content });
    // Refresh list, then select the new note
    const state = get();
    await state.fetchNotes(
      state.searchQuery ? undefined : undefined,
      state.searchQuery || undefined,
    );
    const fullNote = await api.getNote(note.path);
    set({ selectedNote: fullNote });
    return fullNote;
  },

  updateNote: async (path: string, content: string) => {
    const updated = await api.updateNote(path, content);
    set((s) => ({
      selectedNote: s.selectedNote?.path === path
        ? { ...s.selectedNote, ...updated, content }
        : s.selectedNote,
      notes: s.notes.map((n) =>
        n.path === path ? { ...n, ...updated } : n,
      ),
    }));
  },

  deleteNote: async (path: string, permanent?: boolean) => {
    await api.deleteNote(path, permanent);
    set((s) => ({
      notes: s.notes.filter((n) => n.path !== path),
      selectedNote: s.selectedNote?.path === path ? null : s.selectedNote,
    }));
  },

  renameNote: async (path: string, newFilename: string) => {
    const updated = await api.patchNote(path, { filename: newFilename });
    set((s) => ({
      notes: s.notes.map((n) => (n.path === path ? { ...n, ...updated } : n)),
      selectedNote:
        s.selectedNote?.path === path
          ? { ...s.selectedNote, ...updated }
          : s.selectedNote,
    }));
  },

  moveNote: async (path: string, newFolder: string) => {
    const updated = await api.patchNote(path, { folder: newFolder });
    set((s) => ({
      notes: s.notes.map((n) => (n.path === path ? { ...n, ...updated } : n)),
      selectedNote:
        s.selectedNote?.path === path
          ? { ...s.selectedNote, ...updated }
          : s.selectedNote,
    }));
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setSortBy: (sortBy: SortBy) => set({ sortBy }),

  toggleSortDir: () =>
    set((s) => ({ sortDir: s.sortDir === 'asc' ? 'desc' : 'asc' })),

  clearSelection: () => set({ selectedNote: null }),
}));
