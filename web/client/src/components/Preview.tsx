import { useEffect, useState, useCallback } from 'react';
import { useNotesStore } from '../store/notes';
import { renderMarkdown } from '../lib/markdown';

export default function Preview() {
  const { selectedNote, notes } = useNotesStore();
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!selectedNote?.content) {
      setHtml('');
      return;
    }
    let cancelled = false;
    renderMarkdown(selectedNote.content).then((result) => {
      if (!cancelled) setHtml(result);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedNote?.content]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (!link) return;

      const wikilink = link.getAttribute('data-wikilink');
      if (wikilink) {
        e.preventDefault();
        // Find the note whose filename (without .md) matches, case-insensitive
        const allNotes = useNotesStore.getState().notes;
        const searchTerm = wikilink.toLowerCase();
        const matched = allNotes.find((n) => {
          const filename = n.path.split('/').pop()?.replace(/\.md$/i, '') || '';
          return filename.toLowerCase() === searchTerm;
        });
        if (matched) {
          useNotesStore.getState().selectNote(matched.path);
        } else {
          // If not in current list, try to search for it
          // For now just alert if not found
          console.warn(`Wiki link target not found: ${wikilink}`);
        }
        return;
      }

      // Don't interfere with external links
      if (link.getAttribute('target') === '_blank') return;

      // Internal API links (files) - let browser handle
      const href = link.getAttribute('href');
      if (href?.startsWith('/api/')) return;
    },
    [notes],
  );

  if (!selectedNote) return null;

  return (
    <div className="h-full overflow-y-auto p-6" onClick={handleClick}>
      <article
        className="prose prose-gray max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
