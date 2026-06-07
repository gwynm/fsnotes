import { useEffect, useState, useCallback, useRef } from 'react';
import { useNotesStore } from '../store/notes';
import { useFoldersStore, ALL_NOTES, TRASH } from '../store/folders';
import { useUiStore } from '../store/ui';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function folderLabel(activeFolder: string): string {
  if (activeFolder === ALL_NOTES) return 'All Notes';
  if (activeFolder === TRASH) return 'Trash';
  return activeFolder;
}

export default function NoteList() {
  const {
    notes,
    selectedNote,
    loading,
    searchQuery,
    sortBy,
    sortDir,
    fetchNotes,
    selectNote,
    deleteNote,
    renameNote,
    moveNote,
    setSortBy,
    toggleSortDir,
  } = useNotesStore();

  const { activeFolder, folders } = useFoldersStore();
  const { setMode, setMobilePane } = useUiStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    notePath: string;
  } | null>(null);
  const [moveSubmenu, setMoveSubmenu] = useState(false);
  const [renamingNote, setRenamingNote] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Fetch notes when folder, search, or sort changes
  useEffect(() => {
    if (searchQuery) {
      fetchNotes(undefined, searchQuery);
    } else {
      fetchNotes(activeFolder);
    }
  }, [activeFolder, searchQuery, sortBy, sortDir, fetchNotes]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
        setMoveSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  // Focus rename input
  useEffect(() => {
    if (renamingNote && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingNote]);

  const handleNoteClick = useCallback(
    (path: string) => {
      selectNote(path);
      setMobilePane('editor');
    },
    [selectNote, setMobilePane],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, notePath: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, notePath });
      setMoveSubmenu(false);
    },
    [],
  );

  const handleRename = useCallback(() => {
    if (!contextMenu) return;
    const note = notes.find((n) => n.path === contextMenu.notePath);
    if (note) {
      setRenamingNote(contextMenu.notePath);
      // Extract filename without .md extension for editing
      const filename = note.path.split('/').pop() || '';
      setRenameValue(filename.replace(/\.md$/, ''));
    }
    setContextMenu(null);
  }, [contextMenu, notes]);

  const submitRename = useCallback(async () => {
    if (renamingNote && renameValue.trim()) {
      const newFilename = renameValue.trim().endsWith('.md')
        ? renameValue.trim()
        : `${renameValue.trim()}.md`;
      await renameNote(renamingNote, newFilename);
      // Refresh notes
      const { fetchNotes: refetch } = useNotesStore.getState();
      const { activeFolder: folder } = useFoldersStore.getState();
      await refetch(folder);
    }
    setRenamingNote(null);
    setRenameValue('');
  }, [renamingNote, renameValue, renameNote]);

  const handleMoveToFolder = useCallback(
    async (folderName: string) => {
      if (!contextMenu) return;
      await moveNote(contextMenu.notePath, folderName);
      setContextMenu(null);
      setMoveSubmenu(false);
      // Refresh
      const state = useNotesStore.getState();
      await state.fetchNotes(activeFolder);
      await useFoldersStore.getState().fetchFolders();
    },
    [contextMenu, moveNote, activeFolder],
  );

  const handleDelete = useCallback(async () => {
    if (!contextMenu) return;
    const isTrash = activeFolder === TRASH;
    if (isTrash) {
      if (window.confirm('Permanently delete this note?')) {
        await deleteNote(contextMenu.notePath, true);
      }
    } else {
      await deleteNote(contextMenu.notePath);
      await useFoldersStore.getState().fetchFolders();
    }
    setContextMenu(null);
  }, [contextMenu, activeFolder, deleteNote]);

  const sortValue = `${sortBy}-${sortDir}`;

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const [field, dir] = e.target.value.split('-') as ['modified' | 'created' | 'title', 'asc' | 'desc'];
    setSortBy(field);
    if (dir !== sortDir) toggleSortDir();
  }, [setSortBy, sortDir, toggleSortDir]);

  return (
    <div className="flex h-full flex-col bg-white border-r border-gray-200">
      {/* Sort controls */}
      <div className="border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2">
          {/* Back button for mobile */}
          <button
            onClick={() => setMobilePane('sidebar')}
            className="mr-2 text-blue-600 text-sm md:hidden"
          >
            &larr; Back
          </button>
          <select
            value={sortValue}
            onChange={handleSortChange}
            className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-300"
          >
            <option value="modified-desc">Modified ↓</option>
            <option value="modified-asc">Modified ↑</option>
            <option value="created-desc">Created ↓</option>
            <option value="created-asc">Created ↑</option>
            <option value="title-asc">Title ↑</option>
            <option value="title-desc">Title ↓</option>
          </select>
        </div>
      </div>

      {/* Note rows */}
      <div className="flex-1 overflow-y-auto">
        {loading && notes.length === 0 ? (
          <div className="p-4 text-sm text-gray-400">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-sm text-gray-400">
            {searchQuery ? 'No notes found.' : 'No notes in this folder.'}
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.path}>
              {renamingNote === note.path ? (
                <div className="px-4 py-2 border-b border-gray-100">
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={submitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitRename();
                      if (e.key === 'Escape') {
                        setRenamingNote(null);
                        setRenameValue('');
                      }
                    }}
                    className="w-full text-sm px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
              ) : (
                <button
                  onClick={() => handleNoteClick(note.path)}
                  onContextMenu={(e) => handleContextMenu(e, note.path)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedNote?.path === note.path
                      ? 'bg-blue-100 border-l-3 border-l-blue-600'
                      : ''
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {note.title || 'Untitled'}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {note.preview || ''}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    {formatDate(note.modifiedAt)}
                  </div>
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleRename}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Rename
          </button>
          <div className="relative">
            <button
              onClick={() => setMoveSubmenu(!moveSubmenu)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex justify-between items-center"
            >
              <span>Move to...</span>
              <span className="text-gray-400">&#9656;</span>
            </button>
            {moveSubmenu && (
              <div className="absolute left-full top-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px] ml-1">
                {folders
                  .filter((f) => {
                    const note = notes.find(
                      (n) => n.path === contextMenu.notePath,
                    );
                    return f.name !== note?.folder;
                  })
                  .map((f) => (
                    <button
                      key={f.name}
                      onClick={() => handleMoveToFolder(f.name)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {f.name}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={handleDelete}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            {activeFolder === TRASH ? 'Delete Permanently' : 'Move to Trash'}
          </button>
        </div>
      )}
    </div>
  );
}
