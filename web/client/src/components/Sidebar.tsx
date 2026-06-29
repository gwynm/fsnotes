import { useEffect, useState, useCallback, useRef } from 'react';
import { useFoldersStore, ALL_NOTES } from '../store/folders';
import { useNotesStore } from '../store/notes';
import { useUiStore } from '../store/ui';

export default function Sidebar() {
  const {
    folders,
    activeFolder,
    fetchFolders,
    setActiveFolder,
    renameFolder,
    deleteFolder,
  } = useFoldersStore();

  const { fetchNotes, searchQuery, clearSelection } = useNotesStore();
  const { setMobilePane } = useUiStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    folderName: string;
  } | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  // Focus rename input
  useEffect(() => {
    if (renamingFolder && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingFolder]);

  const handleFolderClick = useCallback(
    (name: string) => {
      setActiveFolder(name);
      clearSelection();
      if (!searchQuery) {
        fetchNotes(name);
      }
      setMobilePane('list');
    },
    [setActiveFolder, clearSelection, fetchNotes, searchQuery, setMobilePane],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, folderName: string) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, folderName });
    },
    [],
  );

  const handleNewNoteHere = useCallback(async () => {
    if (!contextMenu) return;
    const folderName = contextMenu.folderName;
    setContextMenu(null);
    setActiveFolder(folderName);
    setMobilePane('list');

    const { createNote } = useNotesStore.getState();
    const content = '# New Note\n';
    await createNote(folderName, 'New Note.md', content);
    setMobilePane('editor');
  }, [contextMenu, setActiveFolder, setMobilePane]);

  const handleRenameFolder = useCallback(() => {
    if (!contextMenu) return;
    setRenamingFolder(contextMenu.folderName);
    setRenameValue(contextMenu.folderName);
    setContextMenu(null);
  }, [contextMenu]);

  const submitRename = useCallback(async () => {
    if (renamingFolder && renameValue.trim() && renameValue !== renamingFolder) {
      await renameFolder(renamingFolder, renameValue.trim());
      const state = useNotesStore.getState();
      await state.fetchNotes(renameValue.trim());
    }
    setRenamingFolder(null);
    setRenameValue('');
  }, [renamingFolder, renameValue, renameFolder]);

  const handleDeleteFolder = useCallback(async () => {
    if (!contextMenu) return;
    const folderName = contextMenu.folderName;
    setContextMenu(null);
    if (
      window.confirm(
        `Delete folder "${folderName}"? Notes inside will be moved to Trash.`,
      )
    ) {
      await deleteFolder(folderName);
      const state = useNotesStore.getState();
      await state.fetchNotes(ALL_NOTES);
    }
  }, [contextMenu, deleteFolder]);

  const totalNotes = folders.reduce((sum, f) => sum + f.noteCount, 0);

  return (
    <div className="flex h-full flex-col bg-gray-50 border-r border-gray-200">
      <div className="flex-1 overflow-y-auto py-2">
        {/* All Notes */}
        <button
          onClick={() => handleFolderClick(ALL_NOTES)}
          className={`w-full text-left px-4 py-2 text-sm font-bold flex justify-between items-center ${
            activeFolder === ALL_NOTES ? 'bg-blue-600 text-white' : 'text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span>All Notes</span>
          <span className={`text-xs font-normal ${activeFolder === ALL_NOTES ? 'text-blue-200' : 'text-gray-500'}`}>{totalNotes}</span>
        </button>

        {/* Divider */}
        <div className="border-t border-gray-200 my-1 mx-4" />

        {/* Folders */}
        {folders.map((folder) => (
          <div key={folder.name}>
            {renamingFolder === folder.name ? (
              <div className="px-4 py-1">
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={submitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitRename();
                    if (e.key === 'Escape') {
                      setRenamingFolder(null);
                      setRenameValue('');
                    }
                  }}
                  className="w-full text-sm px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            ) : (
              <button
                onClick={() => handleFolderClick(folder.name)}
                onContextMenu={(e) => handleContextMenu(e, folder.name)}
                className={`w-full text-left px-4 py-2 text-sm flex justify-between items-center ${
                  activeFolder === folder.name
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="truncate">{folder.name}</span>
                <span className={`text-xs ml-2 shrink-0 ${activeFolder === folder.name ? 'text-blue-200' : 'text-gray-400'}`}>
                  {folder.noteCount}
                </span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={handleNewNoteHere}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            New Note Here
          </button>
          <button
            onClick={handleRenameFolder}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Rename
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={handleDeleteFolder}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Delete Folder
          </button>
        </div>
      )}
    </div>
  );
}
