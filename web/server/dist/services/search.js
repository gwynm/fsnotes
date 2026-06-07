import { getAllNotePaths, readNoteContent } from "./storage.js";
import { getNote } from "./storage.js";
/**
 * Search notes by query string. Splits query into terms (by spaces).
 * All terms must match (case-insensitive) in either the title or content.
 * Returns notes without content.
 */
export async function searchNotes(notesRoot, query) {
    const terms = query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0);
    if (terms.length === 0)
        return [];
    const allPaths = await getAllNotePaths(notesRoot);
    const results = [];
    for (const relativePath of allPaths) {
        try {
            const content = await readNoteContent(notesRoot, relativePath);
            const lowerContent = content.toLowerCase();
            // Extract title for matching
            const firstLine = content.split("\n").find((l) => l.trim().length > 0);
            const title = firstLine
                ? firstLine.trim().replace(/^#+\s*/, "").toLowerCase()
                : "";
            const combined = title + " " + lowerContent;
            const allMatch = terms.every((term) => combined.includes(term));
            if (allMatch) {
                // Get the full note metadata (without content)
                const note = await getNote(notesRoot, relativePath);
                // Remove content from search results
                const { content: _content, ...noteWithoutContent } = note;
                results.push(noteWithoutContent);
            }
        }
        catch {
            // Skip files that can't be read
        }
    }
    return results;
}
//# sourceMappingURL=search.js.map