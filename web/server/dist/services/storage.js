import fs from "node:fs/promises";
import path from "node:path";
const RESERVED_DIRS = new Set(["i", "files", ".Trash", ".git"]);
function isReservedDir(name) {
    return RESERVED_DIRS.has(name) || name.startsWith(".");
}
/**
 * Extract title from note content: first non-empty line, strip leading "# ".
 */
function extractTitle(content) {
    const lines = content.split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
            return trimmed.replace(/^#+\s*/, "");
        }
    }
    return "Untitled";
}
/**
 * Extract preview from note content: ~150 chars after the title line, strip markdown.
 */
function extractPreview(content) {
    const lines = content.split("\n");
    let foundTitle = false;
    const previewParts = [];
    let totalLen = 0;
    for (const line of lines) {
        const trimmed = line.trim();
        if (!foundTitle) {
            if (trimmed.length > 0) {
                foundTitle = true;
            }
            continue;
        }
        if (trimmed.length === 0)
            continue;
        // Strip common markdown syntax
        const cleaned = trimmed
            .replace(/^#+\s*/, "") // headings
            .replace(/\*\*(.+?)\*\*/g, "$1") // bold
            .replace(/\*(.+?)\*/g, "$1") // italic
            .replace(/__(.+?)__/g, "$1") // bold
            .replace(/_(.+?)_/g, "$1") // italic
            .replace(/~~(.+?)~~/g, "$1") // strikethrough
            .replace(/`(.+?)`/g, "$1") // inline code
            .replace(/!\[.*?\]\(.*?\)/g, "") // images
            .replace(/\[(.+?)\]\(.*?\)/g, "$1") // links
            .replace(/^>\s*/g, "") // blockquotes
            .replace(/^[-*+]\s+/g, "") // list items
            .replace(/^\d+\.\s+/g, "") // numbered lists
            .trim();
        if (cleaned.length === 0)
            continue;
        previewParts.push(cleaned);
        totalLen += cleaned.length;
        if (totalLen >= 150)
            break;
    }
    const preview = previewParts.join(" ");
    return preview.length > 150 ? preview.slice(0, 150) + "..." : preview;
}
/**
 * Ensure required directories exist.
 */
export async function ensureDirectories(notesRoot) {
    await fs.mkdir(notesRoot, { recursive: true });
    await fs.mkdir(path.join(notesRoot, "i"), { recursive: true });
    await fs.mkdir(path.join(notesRoot, "files"), { recursive: true });
    await fs.mkdir(path.join(notesRoot, ".Trash"), { recursive: true });
}
/**
 * Build a Note object from a file path.
 */
async function buildNote(notesRoot, relativePath, includeContent) {
    const fullPath = path.join(notesRoot, relativePath);
    const stat = await fs.stat(fullPath);
    const content = await fs.readFile(fullPath, "utf-8");
    const folder = path.dirname(relativePath);
    const title = extractTitle(content);
    const preview = extractPreview(content);
    const note = {
        path: relativePath,
        folder: folder === "." ? "" : folder,
        title,
        preview,
        createdAt: stat.birthtime.toISOString(),
        modifiedAt: stat.mtime.toISOString(),
    };
    if (includeContent) {
        note.content = content;
    }
    return note;
}
/**
 * Recursively collect all .md files in a directory.
 */
async function collectMdFiles(dir, notesRoot) {
    const results = [];
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    }
    catch {
        return results;
    }
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const rel = path.relative(notesRoot, fullPath);
        if (entry.isDirectory()) {
            // Skip reserved directories at the top level
            const topDir = rel.split(path.sep)[0];
            if (isReservedDir(topDir))
                continue;
            const sub = await collectMdFiles(fullPath, notesRoot);
            results.push(...sub);
        }
        else if (entry.isFile() && entry.name.endsWith(".md")) {
            results.push(rel);
        }
    }
    return results;
}
/**
 * List all notes (without content).
 */
export async function listNotes(notesRoot, options = {}) {
    const { folder, sort = "modified", dir = "desc", trash = false } = options;
    let searchDir;
    if (trash) {
        searchDir = path.join(notesRoot, ".Trash");
    }
    else if (folder) {
        searchDir = path.join(notesRoot, folder);
    }
    else {
        searchDir = notesRoot;
    }
    const files = trash
        ? await collectMdFilesFlat(searchDir)
        : await collectMdFiles(searchDir, notesRoot);
    const notes = [];
    for (const rel of files) {
        try {
            // For trash, the relative path should include .Trash
            const actualRel = trash ? path.join(".Trash", rel) : rel;
            // If a folder filter was specified (non-trash), only include notes from that folder
            if (!trash && folder) {
                const noteFolder = path.dirname(actualRel);
                if (noteFolder !== folder)
                    continue;
            }
            const note = await buildNote(notesRoot, actualRel, false);
            notes.push(note);
        }
        catch {
            // skip files that can't be read
        }
    }
    // Sort
    notes.sort((a, b) => {
        let cmp = 0;
        switch (sort) {
            case "title":
                cmp = a.title.localeCompare(b.title);
                break;
            case "created":
                cmp =
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                break;
            case "modified":
            default:
                cmp =
                    new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
                break;
        }
        return dir === "asc" ? cmp : -cmp;
    });
    return notes;
}
/**
 * Collect .md files from a single directory (non-recursive, used for .Trash).
 */
async function collectMdFilesFlat(dir) {
    const results = [];
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    }
    catch {
        return results;
    }
    for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".md")) {
            results.push(entry.name);
        }
    }
    return results;
}
/**
 * Get a single note by its relative path (with content).
 */
export async function getNote(notesRoot, relativePath) {
    return buildNote(notesRoot, relativePath, true);
}
/**
 * Create a new note.
 */
export async function createNote(notesRoot, folder, filename, content) {
    const folderPath = path.join(notesRoot, folder);
    await fs.mkdir(folderPath, { recursive: true });
    const relativePath = path.join(folder, filename);
    const fullPath = path.join(notesRoot, relativePath);
    // Check if file already exists
    try {
        await fs.access(fullPath);
        throw Object.assign(new Error(`Note already exists: ${relativePath}`), {
            statusCode: 409,
            code: "ALREADY_EXISTS",
        });
    }
    catch (err) {
        if (err &&
            typeof err === "object" &&
            "code" in err &&
            err.code === "ENOENT") {
            // File doesn't exist, good
        }
        else {
            throw err;
        }
    }
    await fs.writeFile(fullPath, content, "utf-8");
    return buildNote(notesRoot, relativePath, true);
}
/**
 * Update note content.
 */
export async function updateNoteContent(notesRoot, relativePath, content) {
    const fullPath = path.join(notesRoot, relativePath);
    await fs.access(fullPath); // throws if not found
    await fs.writeFile(fullPath, content, "utf-8");
    return buildNote(notesRoot, relativePath, true);
}
/**
 * Rename or move a note.
 */
export async function patchNote(notesRoot, relativePath, options) {
    const fullPath = path.join(notesRoot, relativePath);
    await fs.access(fullPath); // throws if not found
    const currentFolder = path.dirname(relativePath);
    const currentFilename = path.basename(relativePath);
    const newFolder = options.folder ?? currentFolder;
    const newFilename = options.filename ?? currentFilename;
    const newRelativePath = path.join(newFolder, newFilename);
    if (newRelativePath === relativePath) {
        return buildNote(notesRoot, relativePath, false);
    }
    const newFolderPath = path.join(notesRoot, newFolder);
    await fs.mkdir(newFolderPath, { recursive: true });
    const newFullPath = path.join(notesRoot, newRelativePath);
    // Check if destination already exists
    try {
        await fs.access(newFullPath);
        throw Object.assign(new Error(`Note already exists: ${newRelativePath}`), { statusCode: 409, code: "ALREADY_EXISTS" });
    }
    catch (err) {
        if (err &&
            typeof err === "object" &&
            "code" in err &&
            err.code === "ENOENT") {
            // Doesn't exist, good
        }
        else {
            throw err;
        }
    }
    await fs.rename(fullPath, newFullPath);
    return buildNote(notesRoot, newRelativePath, false);
}
/**
 * Soft delete: move to .Trash. If permanent=true, hard delete.
 */
export async function deleteNote(notesRoot, relativePath, permanent) {
    const fullPath = path.join(notesRoot, relativePath);
    await fs.access(fullPath); // throws if not found
    if (permanent) {
        await fs.unlink(fullPath);
    }
    else {
        const trashDir = path.join(notesRoot, ".Trash");
        await fs.mkdir(trashDir, { recursive: true });
        const filename = path.basename(relativePath);
        let destPath = path.join(trashDir, filename);
        // Handle name conflicts in trash
        let counter = 1;
        while (true) {
            try {
                await fs.access(destPath);
                const ext = path.extname(filename);
                const base = path.basename(filename, ext);
                destPath = path.join(trashDir, `${base}_${counter}${ext}`);
                counter++;
            }
            catch {
                break;
            }
        }
        await fs.rename(fullPath, destPath);
    }
}
/**
 * List folders with note counts. Excludes reserved directories.
 */
export async function listFolders(notesRoot) {
    const entries = await fs.readdir(notesRoot, { withFileTypes: true });
    const folders = [];
    for (const entry of entries) {
        if (!entry.isDirectory())
            continue;
        if (isReservedDir(entry.name))
            continue;
        const folderPath = path.join(notesRoot, entry.name);
        let noteCount = 0;
        try {
            const files = await fs.readdir(folderPath);
            noteCount = files.filter((f) => f.endsWith(".md")).length;
        }
        catch {
            // skip if we can't read
        }
        folders.push({ name: entry.name, noteCount });
    }
    // Sort alphabetically
    folders.sort((a, b) => a.name.localeCompare(b.name));
    return folders;
}
/**
 * Create a folder.
 */
export async function createFolder(notesRoot, name) {
    if (isReservedDir(name)) {
        throw Object.assign(new Error(`Folder name "${name}" is reserved`), {
            statusCode: 400,
            code: "RESERVED_NAME",
        });
    }
    const folderPath = path.join(notesRoot, name);
    try {
        await fs.access(folderPath);
        throw Object.assign(new Error(`Folder already exists: ${name}`), {
            statusCode: 409,
            code: "ALREADY_EXISTS",
        });
    }
    catch (err) {
        if (err &&
            typeof err === "object" &&
            "code" in err &&
            err.code === "ENOENT") {
            // Doesn't exist, good
        }
        else {
            throw err;
        }
    }
    await fs.mkdir(folderPath, { recursive: true });
    return { name, noteCount: 0 };
}
/**
 * Rename a folder.
 */
export async function renameFolder(notesRoot, oldName, newName) {
    if (isReservedDir(newName)) {
        throw Object.assign(new Error(`Folder name "${newName}" is reserved`), {
            statusCode: 400,
            code: "RESERVED_NAME",
        });
    }
    const oldPath = path.join(notesRoot, oldName);
    const newPath = path.join(notesRoot, newName);
    await fs.access(oldPath); // throws if not found
    try {
        await fs.access(newPath);
        throw Object.assign(new Error(`Folder already exists: ${newName}`), {
            statusCode: 409,
            code: "ALREADY_EXISTS",
        });
    }
    catch (err) {
        if (err &&
            typeof err === "object" &&
            "code" in err &&
            err.code === "ENOENT") {
            // Doesn't exist, good
        }
        else {
            throw err;
        }
    }
    await fs.rename(oldPath, newPath);
    // Count notes in renamed folder
    const files = await fs.readdir(newPath);
    const noteCount = files.filter((f) => f.endsWith(".md")).length;
    return { name: newName, noteCount };
}
/**
 * Delete a folder. Moves contents to .Trash if not empty.
 */
export async function deleteFolder(notesRoot, name) {
    if (isReservedDir(name)) {
        throw Object.assign(new Error(`Cannot delete reserved folder: ${name}`), {
            statusCode: 400,
            code: "RESERVED_NAME",
        });
    }
    const folderPath = path.join(notesRoot, name);
    await fs.access(folderPath); // throws if not found
    const entries = await fs.readdir(folderPath);
    const mdFiles = entries.filter((f) => f.endsWith(".md"));
    if (mdFiles.length > 0) {
        // Move notes to trash
        const trashDir = path.join(notesRoot, ".Trash");
        await fs.mkdir(trashDir, { recursive: true });
        for (const file of mdFiles) {
            const srcPath = path.join(folderPath, file);
            let destPath = path.join(trashDir, file);
            // Handle name conflicts
            let counter = 1;
            while (true) {
                try {
                    await fs.access(destPath);
                    const ext = path.extname(file);
                    const base = path.basename(file, ext);
                    destPath = path.join(trashDir, `${base}_${counter}${ext}`);
                    counter++;
                }
                catch {
                    break;
                }
            }
            await fs.rename(srcPath, destPath);
        }
    }
    // Remove the folder (and any remaining non-md files)
    await fs.rm(folderPath, { recursive: true, force: true });
}
/**
 * Read the raw content of a note for search purposes.
 */
export async function readNoteContent(notesRoot, relativePath) {
    const fullPath = path.join(notesRoot, relativePath);
    return fs.readFile(fullPath, "utf-8");
}
/**
 * Get all .md file paths (for search).
 */
export async function getAllNotePaths(notesRoot) {
    return collectMdFiles(notesRoot, notesRoot);
}
//# sourceMappingURL=storage.js.map