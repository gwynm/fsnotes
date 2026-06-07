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

export function loadConfig(): AppConfig {
  return {
    notesRoot: process.env.NOTES_ROOT || "/data/notes",
    port: parseInt(process.env.PORT || "3000", 10),
    gitAutoCommitSecs: parseInt(process.env.GIT_AUTO_COMMIT_SECS || "300", 10),
    gitAutoPullSecs: parseInt(process.env.GIT_AUTO_PULL_SECS || "60", 10),
    gitSshKey: process.env.GIT_SSH_KEY,
    editorFont: process.env.EDITOR_FONT,
    editorFontSize: process.env.EDITOR_FONT_SIZE,
    theme: process.env.THEME,
    codeTheme: process.env.CODE_THEME,
  };
}
