import { useEffect, useCallback, useRef, useState } from 'react';
import Sidebar from './Sidebar';
import NoteList from './NoteList';
import Editor from './Editor';
import Preview from './Preview';
import { useUiStore } from '../store/ui';
import { useNotesStore } from '../store/notes';
import { useFoldersStore, ALL_NOTES } from '../store/folders';
import { getSaveStatus } from '../lib/api';
import type { SaveStatus } from '../types';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

/** Right pane: editor or preview */
function RightPane() {
  const { mode } = useUiStore();
  const { selectedNote } = useNotesStore();

  if (!selectedNote) {
    return <Editor />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {mode === 'preview' ? <Preview /> : <Editor />}
    </div>
  );
}

export default function Layout() {
  const {
    mode,
    setMode,
    mobilePane,
    setMobilePane,
  } = useUiStore();
  const {
    searchQuery,
    setSearchQuery,
    fetchNotes,
  } = useNotesStore();
  const { activeFolder, folders, fetchFolders } = useFoldersStore();

  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isMobile = useIsMobile();

  // Poll save status every 3s
  useEffect(() => {
    const fetchStatus = () => {
      getSaveStatus()
        .then(setSaveStatus)
        .catch(() => setSaveStatus(null));
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  // Handle search input with debounce
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchQuery(value);
      clearTimeout(searchTimerRef.current);
      if (value.trim()) {
        searchTimerRef.current = setTimeout(() => {
          fetchNotes(activeFolder, value.trim());
        }, 300);
      } else {
        fetchNotes(activeFolder);
      }
    },
    [setSearchQuery, fetchNotes, activeFolder],
  );

  // Create new note
  const handleNewNote = useCallback(async () => {
    const folder =
      activeFolder === ALL_NOTES || activeFolder === '__trash__'
        ? folders[0]?.name || 'development'
        : activeFolder;
    const content = '# New Note\n';
    const { createNote } = useNotesStore.getState();
    await createNote(folder, 'New Note.md', content);
    await fetchFolders();
    setMobilePane('editor');
  }, [activeFolder, folders, fetchFolders, setMobilePane]);

  // Save status display
  const saveStatusText = saveStatus
    ? saveStatus.state === 'saved'
      ? 'All changes saved'
      : saveStatus.state === 'saving'
        ? 'Saving...'
        : `ERROR: ${saveStatus.error || 'Unknown error'}`
    : '';
  const saveStatusColor = saveStatus?.state === 'error' ? 'text-red-600 font-semibold' : 'text-gray-400';

  // Mobile layout: stack navigation
  if (isMobile) {
    return (
      <div className="flex h-screen flex-col bg-white">
        {/* Mobile header */}
        <header className="flex items-center gap-2 border-b border-gray-200 px-4 py-2 bg-white shrink-0">
          {mobilePane === 'sidebar' && (
            <>
              <h1 className="text-sm font-bold text-gray-900 flex-1">FSNotes</h1>
              <button
                onClick={() => {
                  setMobilePane('list');
                }}
                className="text-blue-600 text-sm"
              >
                Search
              </button>
            </>
          )}
          {mobilePane !== 'sidebar' && (
            <div className="flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          )}
          <button
            onClick={handleNewNote}
            className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md border border-blue-700 shrink-0"
          >
            + New
          </button>
        </header>

        {/* Mobile content */}
        <main className="flex-1 overflow-hidden">
          {mobilePane === 'sidebar' && <Sidebar />}
          {mobilePane === 'list' && <NoteList />}
          {mobilePane === 'editor' && <RightPane />}
        </main>

        {/* Mobile footer */}
        <footer className={`flex items-center border-t border-gray-200 px-4 py-1.5 text-[11px] bg-gray-50 shrink-0 ${saveStatusColor}`}>
          <span>{saveStatusText}</span>
        </footer>
      </div>
    );
  }

  // Desktop layout: three panes
  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-gray-200 px-4 py-2 bg-white shrink-0">
        <div className="flex-1 max-w-md">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
        </div>

        <div className="flex-1" />

        <div className="flex rounded-md border border-gray-400 overflow-hidden">
          <button
            onClick={() => setMode('edit')}
            className={`px-4 py-1.5 text-sm font-semibold border-r border-gray-400 ${
              mode === 'edit'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Edit
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`px-4 py-1.5 text-sm font-semibold ${
              mode === 'preview'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            Preview
          </button>
        </div>

        <button
          onClick={handleNewNote}
          className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded-md border border-blue-700"
        >
          + New Note
        </button>
      </header>

      {/* Three pane body */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar — always visible on desktop */}
        <div className="w-[200px] shrink-0 overflow-hidden">
          <Sidebar />
        </div>

        {/* Note list */}
        <div className="w-[280px] shrink-0 overflow-hidden">
          <NoteList />
        </div>

        {/* Editor / Preview */}
        <div className="flex-1 overflow-hidden">
          <RightPane />
        </div>
      </main>

      {/* Footer */}
      <footer className={`flex items-center border-t border-gray-200 px-4 py-1.5 text-[11px] bg-gray-50 shrink-0 ${saveStatusColor}`}>
        <span>{saveStatusText}</span>
      </footer>
    </div>
  );
}
