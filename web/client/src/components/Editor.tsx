import { useEffect, useRef, useCallback, useMemo } from 'react';
import { EditorView, keymap, placeholder } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { useNotesStore } from '../store/notes';
import { uploadFile } from '../lib/api';

/**
 * Debounce helper: returns a function that delays invocation.
 */
function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delay: number,
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useMemo(() => {
    const debounced = (...args: Parameters<T>) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(...(args as never[])), delay);
    };
    return debounced as unknown as T;
  }, [delay]);
}

interface ToolbarButton {
  label: string;
  title: string;
  action: (view: EditorView) => void;
}

function wrapSelection(view: EditorView, before: string, after: string) {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);
  view.dispatch({
    changes: { from, to, insert: `${before}${selected}${after}` },
    selection: { anchor: from + before.length, head: to + before.length },
  });
  view.focus();
}

function prefixLine(view: EditorView, prefix: string) {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);
  view.dispatch({
    changes: { from: line.from, to: line.from, insert: prefix },
  });
  view.focus();
}

function insertAtCursor(view: EditorView, text: string) {
  const { from } = view.state.selection.main;
  view.dispatch({
    changes: { from, to: from, insert: text },
    selection: { anchor: from + text.length },
  });
  view.focus();
}

export default function Editor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const { selectedNote, updateNote } = useNotesStore();

  // Track the note path to avoid stale closure issues
  const notePathRef = useRef<string | null>(null);

  const debouncedSave = useDebouncedCallback(
    (path: string, content: string) => {
      updateNote(path, content);
    },
    1000,
  );

  // Handle file upload (image paste, drag-drop, or button)
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!viewRef.current) return;
      try {
        const result = await uploadFile(file);
        insertAtCursor(viewRef.current, result.markdown);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    },
    [],
  );

  // Initialize / update CodeMirror
  useEffect(() => {
    if (!editorRef.current) return;
    const notePath = selectedNote?.path ?? null;
    notePathRef.current = notePath;

    // Destroy existing editor
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    if (!selectedNote) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && notePathRef.current) {
        const content = update.state.doc.toString();
        debouncedSave(notePathRef.current, content);
      }
    });

    // Paste handler for images
    const pasteHandler = EditorView.domEventHandlers({
      paste(event) {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) handleFileUpload(file);
            return true;
          }
        }
        return false;
      },
      drop(event) {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;
        for (const file of files) {
          if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            event.preventDefault();
            handleFileUpload(file);
            return true;
          }
        }
        return false;
      },
    });

    const state = EditorState.create({
      doc: selectedNote.content || '',
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        updateListener,
        pasteHandler,
        placeholder('Start writing...'),
        EditorView.lineWrapping,
        EditorView.theme({
          '&': {
            fontSize: '14px',
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          },
          '.cm-content': {
            padding: '16px',
            minHeight: '100%',
          },
          '.cm-gutters': {
            display: 'none',
          },
          '.cm-focused': {
            outline: 'none',
          },
          '.cm-scroller': {
            overflow: 'auto',
          },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNote?.path, selectedNote?.content]);

  // Toolbar buttons
  const toolbarButtons: ToolbarButton[] = useMemo(
    () => [
      {
        label: 'B',
        title: 'Bold',
        action: (v) => wrapSelection(v, '**', '**'),
      },
      {
        label: 'I',
        title: 'Italic',
        action: (v) => wrapSelection(v, '_', '_'),
      },
      {
        label: 'S',
        title: 'Strikethrough',
        action: (v) => wrapSelection(v, '~~', '~~'),
      },
      {
        label: 'UL',
        title: 'Bullet List',
        action: (v) => prefixLine(v, '- '),
      },
      {
        label: 'OL',
        title: 'Numbered List',
        action: (v) => prefixLine(v, '1. '),
      },
      {
        label: '[]',
        title: 'Checkbox',
        action: (v) => prefixLine(v, '- [ ] '),
      },
      {
        label: '<>',
        title: 'Code Block',
        action: (v) => wrapSelection(v, '```\n', '\n```'),
      },
      {
        label: '>',
        title: 'Blockquote',
        action: (v) => prefixLine(v, '> '),
      },
      {
        label: 'Link',
        title: 'Insert Link',
        action: (v) => {
          const { from, to } = v.state.selection.main;
          const selected = v.state.sliceDoc(from, to);
          if (selected) {
            v.dispatch({
              changes: {
                from,
                to,
                insert: `[${selected}](url)`,
              },
            });
          } else {
            insertAtCursor(v, '[link text](url)');
          }
          v.focus();
        },
      },
    ],
    [],
  );

  const handleImageUploadClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        await handleFileUpload(file);
      }
    };
    input.click();
  }, [handleFileUpload]);

  const handleHeadingSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const level = parseInt(e.target.value);
      if (viewRef.current && level >= 1 && level <= 6) {
        const prefix = '#'.repeat(level) + ' ';
        prefixLine(viewRef.current, prefix);
      }
      e.target.value = '0';
    },
    [],
  );

  if (!selectedNote) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <p className="text-lg">No note selected</p>
          <p className="text-sm mt-1">Select a note from the list or create a new one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Formatting toolbar */}
      <div className="flex items-center gap-1 border-b border-gray-200 px-3 py-1.5 bg-gray-50 overflow-x-auto">
        {toolbarButtons.map((btn) => (
          <button
            key={btn.title}
            title={btn.title}
            onClick={() => viewRef.current && btn.action(viewRef.current)}
            className="px-2.5 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded hover:bg-gray-100 active:bg-gray-200 shrink-0"
          >
            {btn.label}
          </button>
        ))}

        {/* Heading dropdown */}
        <select
          onChange={handleHeadingSelect}
          defaultValue="0"
          title="Heading Level"
          className="px-1.5 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded focus:outline-none shrink-0"
        >
          <option value="0" disabled>
            H
          </option>
          <option value="1">H1</option>
          <option value="2">H2</option>
          <option value="3">H3</option>
          <option value="4">H4</option>
          <option value="5">H5</option>
          <option value="6">H6</option>
        </select>

        {/* Image upload */}
        <button
          title="Upload Image"
          onClick={handleImageUploadClick}
          className="px-2.5 py-1 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded hover:bg-gray-100 active:bg-gray-200 shrink-0"
        >
          Img
        </button>
      </div>

      {/* Editor content */}
      <div ref={editorRef} className="flex-1 overflow-auto" />
    </div>
  );
}
