import type { Note, Folder } from "@fsnotes/shared";
/**
 * Ensure required directories exist.
 */
export declare function ensureDirectories(notesRoot: string): Promise<void>;
/**
 * List all notes (without content).
 */
export declare function listNotes(notesRoot: string, options?: {
    folder?: string;
    sort?: "modified" | "created" | "title";
    dir?: "asc" | "desc";
    trash?: boolean;
}): Promise<Note[]>;
/**
 * Get a single note by its relative path (with content).
 */
export declare function getNote(notesRoot: string, relativePath: string): Promise<Note>;
/**
 * Create a new note.
 */
export declare function createNote(notesRoot: string, folder: string, filename: string, content: string): Promise<Note>;
/**
 * Update note content.
 */
export declare function updateNoteContent(notesRoot: string, relativePath: string, content: string): Promise<Note>;
/**
 * Rename or move a note.
 */
export declare function patchNote(notesRoot: string, relativePath: string, options: {
    filename?: string;
    folder?: string;
}): Promise<Note>;
/**
 * Soft delete: move to .Trash. If permanent=true, hard delete.
 */
export declare function deleteNote(notesRoot: string, relativePath: string, permanent: boolean): Promise<void>;
/**
 * List folders with note counts. Excludes reserved directories.
 */
export declare function listFolders(notesRoot: string): Promise<Folder[]>;
/**
 * Create a folder.
 */
export declare function createFolder(notesRoot: string, name: string): Promise<Folder>;
/**
 * Rename a folder.
 */
export declare function renameFolder(notesRoot: string, oldName: string, newName: string): Promise<Folder>;
/**
 * Delete a folder. Moves contents to .Trash if not empty.
 */
export declare function deleteFolder(notesRoot: string, name: string): Promise<void>;
/**
 * Read the raw content of a note for search purposes.
 */
export declare function readNoteContent(notesRoot: string, relativePath: string): Promise<string>;
/**
 * Get all .md file paths (for search).
 */
export declare function getAllNotePaths(notesRoot: string): Promise<string[]>;
//# sourceMappingURL=storage.d.ts.map