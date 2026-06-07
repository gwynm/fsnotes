import type { Note } from "@fsnotes/shared";
/**
 * Search notes by query string. Splits query into terms (by spaces).
 * All terms must match (case-insensitive) in either the title or content.
 * Returns notes without content.
 */
export declare function searchNotes(notesRoot: string, query: string): Promise<Note[]>;
//# sourceMappingURL=search.d.ts.map