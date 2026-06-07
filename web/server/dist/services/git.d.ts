import type { GitStatus } from "@fsnotes/shared";
/**
 * Initialize the git service. Checks if NOTES_ROOT is a git repo.
 * Sets up auto-commit and auto-pull timers.
 */
export declare function initGit(notesRoot: string, options: {
    autoCommitSecs: number;
    autoPullSecs: number;
    sshKey?: string;
}): Promise<void>;
/**
 * Get git status.
 */
export declare function getGitStatus(): Promise<GitStatus>;
/**
 * Stop all timers (for graceful shutdown).
 */
export declare function stopGit(): void;
//# sourceMappingURL=git.d.ts.map