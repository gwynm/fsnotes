import { useEffect } from 'react';
import Layout from './components/Layout';
import { useFoldersStore } from './store/folders';
import { useNotesStore } from './store/notes';

export default function App() {
  const fetchFolders = useFoldersStore((s) => s.fetchFolders);
  const fetchNotes = useNotesStore((s) => s.fetchNotes);
  const activeFolder = useFoldersStore((s) => s.activeFolder);

  // Initial data load
  useEffect(() => {
    fetchFolders();
    fetchNotes(activeFolder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Layout />;
}
