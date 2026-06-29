/** Server-only types */
export interface NoteFile {
    /** Relative path from NOTES_ROOT, e.g. "Journal/2024-01-01.md" */
    relativePath: string;
    /** Folder name, e.g. "Journal" */
    folder: string;
    /** Filename, e.g. "2024-01-01.md" */
    filename: string;
}
export interface AppConfig {
    notesRoot: string;
    port: number;
    gitAutoCommitSecs: number;
    gitAutoPullSecs: number;
    gitSshKey?: string;
    editorFont?: string;
    editorFontSize?: string;
    theme?: string;
    codeTheme?: string;
}
export declare function loadConfig(): AppConfig;
//# sourceMappingURL=types.d.ts.map