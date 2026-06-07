/** Server-only types */
export function loadConfig() {
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
//# sourceMappingURL=types.js.map