import { simpleGit } from "simple-git";
let git = null;
let commitTimer = null;
let pullTimer = null;
/**
 * Initialize the git service. Checks if NOTES_ROOT is a git repo.
 * Sets up auto-commit and auto-pull timers.
 */
export async function initGit(notesRoot, options) {
    const env = {};
    if (options.sshKey) {
        env.GIT_SSH_COMMAND = `ssh -i ${options.sshKey} -o StrictHostKeyChecking=no`;
    }
    const g = simpleGit(notesRoot);
    // Check if this is a git repo
    const isRepo = await g.checkIsRepo();
    if (!isRepo) {
        console.log("[git] NOTES_ROOT is not a git repo, git features disabled");
        return;
    }
    git = g;
    if (Object.keys(env).length > 0) {
        git.env(env);
    }
    console.log("[git] Git repo detected at", notesRoot);
    // Set up auto-commit timer
    if (options.autoCommitSecs > 0) {
        console.log(`[git] Auto-commit every ${options.autoCommitSecs}s`);
        commitTimer = setInterval(() => void autoCommit(), options.autoCommitSecs * 1000);
    }
    // Set up auto-pull timer
    if (options.autoPullSecs > 0) {
        console.log(`[git] Auto-pull every ${options.autoPullSecs}s`);
        pullTimer = setInterval(() => void autoPull(), options.autoPullSecs * 1000);
    }
}
/**
 * Get git status.
 */
export async function getGitStatus() {
    if (!git) {
        return { clean: true, ahead: 0, behind: 0, files: 0 };
    }
    try {
        const status = await git.status();
        return {
            clean: status.isClean(),
            ahead: status.ahead,
            behind: status.behind,
            files: status.files.length,
        };
    }
    catch (err) {
        console.error("[git] Error getting status:", err);
        return { clean: true, ahead: 0, behind: 0, files: 0 };
    }
}
/**
 * Auto-commit all changes. After commit, push if there's a remote.
 */
async function autoCommit() {
    if (!git)
        return;
    try {
        const status = await git.status();
        if (status.isClean())
            return;
        await git.add("-A");
        await git.commit("auto-commit");
        console.log("[git] Auto-committed changes");
        // Push if there's a remote
        try {
            const remotes = await git.getRemotes();
            if (remotes.length > 0) {
                await git.push();
                console.log("[git] Pushed to remote");
            }
        }
        catch (pushErr) {
            console.error("[git] Push failed:", pushErr);
        }
    }
    catch (err) {
        console.error("[git] Auto-commit failed:", err);
    }
}
/**
 * Auto-pull from origin.
 */
async function autoPull() {
    if (!git)
        return;
    try {
        const remotes = await git.getRemotes();
        if (remotes.length === 0)
            return;
        await git.pull();
        console.log("[git] Auto-pulled from remote");
    }
    catch (err) {
        console.error("[git] Auto-pull failed:", err);
    }
}
/**
 * Stop all timers (for graceful shutdown).
 */
export function stopGit() {
    if (commitTimer) {
        clearInterval(commitTimer);
        commitTimer = null;
    }
    if (pullTimer) {
        clearInterval(pullTimer);
        pullTimer = null;
    }
}
//# sourceMappingURL=git.js.map