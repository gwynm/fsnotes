import { simpleGit, type SimpleGit } from "simple-git";
import type { SaveStatus } from "@fsnotes/shared";

let git: SimpleGit | null = null;
let pullTimer: ReturnType<typeof setInterval> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let saveDelaySecs = 5;

let currentStatus: SaveStatus = { state: "saved" };

/**
 * Initialize the git service. Checks if NOTES_ROOT is a git repo.
 */
export async function initGit(
  notesRoot: string,
  options: {
    autoCommitSecs: number;
    autoPullSecs: number;
    sshKey?: string;
  },
): Promise<void> {
  const env: Record<string, string> = {};
  if (options.sshKey) {
    env.GIT_SSH_COMMAND = `ssh -i ${options.sshKey} -o StrictHostKeyChecking=no`;
  }

  const g = simpleGit(notesRoot);

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

  saveDelaySecs = options.autoCommitSecs > 0 ? options.autoCommitSecs : 5;

  // Auto-pull on a timer
  if (options.autoPullSecs > 0) {
    console.log(`[git] Auto-pull every ${options.autoPullSecs}s`);
    pullTimer = setInterval(
      () => void pullAndMerge(),
      options.autoPullSecs * 1000,
    );
  }

  // Check initial state
  await refreshStatus();
}

/**
 * Get the current save status.
 */
export function getSaveStatus(): SaveStatus {
  return currentStatus;
}

/**
 * Called after any file write. Schedules a commit+push cycle
 * after a short debounce so rapid edits batch together.
 */
export function markDirty(): void {
  if (!git) return;

  currentStatus = { state: "saving" };

  // Reset the debounce timer
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void commitPullPush(), saveDelaySecs * 1000);
}

/**
 * Commit all changes, pull (auto-merge), push.
 */
async function commitPullPush(): Promise<void> {
  if (!git) return;

  try {
    // Commit local changes
    const status = await git.status();
    if (!status.isClean()) {
      await git.add("-A");
      await git.commit("auto-commit");
      console.log("[git] Committed changes");
    }

    // Pull with auto-merge (no rebase, allow merge commits)
    const remotes = await git.getRemotes();
    if (remotes.length > 0) {
      try {
        await git.pull(["--no-rebase"]);
        console.log("[git] Pulled from remote");
      } catch (pullErr: unknown) {
        const msg =
          pullErr instanceof Error ? pullErr.message : String(pullErr);
        // Check if it's a merge conflict
        if (msg.includes("CONFLICT") || msg.includes("Merge conflict")) {
          // Abort the merge, report error
          try {
            await git.raw(["merge", "--abort"]);
          } catch {
            // may fail if not in merge state
          }
          currentStatus = {
            state: "error",
            error: "Merge conflict — resolve manually via git",
          };
          console.error("[git] Merge conflict, aborting merge");
          return;
        }
        throw pullErr;
      }

      // Push
      await git.push();
      console.log("[git] Pushed to remote");
    }

    currentStatus = { state: "saved" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[git] Save failed:", msg);
    currentStatus = { state: "error", error: msg };
  }
}

/**
 * Pull from remote and auto-merge. Called on a timer independently
 * of user edits, to pick up changes from other sources.
 */
async function pullAndMerge(): Promise<void> {
  if (!git) return;

  try {
    const remotes = await git.getRemotes();
    if (remotes.length === 0) return;

    // Don't pull during a save cycle
    if (currentStatus.state === "saving") return;

    await git.pull(["--no-rebase"]);

    // After pulling, check if we're clean
    await refreshStatus();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("CONFLICT") || msg.includes("Merge conflict")) {
      try {
        await git.raw(["merge", "--abort"]);
      } catch {
        // ignore
      }
      currentStatus = {
        state: "error",
        error: "Merge conflict — resolve manually via git",
      };
      console.error("[git] Merge conflict during auto-pull");
    } else {
      console.error("[git] Auto-pull failed:", msg);
      currentStatus = { state: "error", error: msg };
    }
  }
}

/**
 * Check the repo state and set status accordingly.
 */
async function refreshStatus(): Promise<void> {
  if (!git) return;

  try {
    const status = await git.status();
    if (status.isClean() && status.ahead === 0) {
      currentStatus = { state: "saved" };
    } else if (!status.isClean() || status.ahead > 0) {
      // There are uncommitted or unpushed changes — trigger a save
      markDirty();
    }
  } catch {
    // ignore
  }
}

/**
 * Stop all timers (for graceful shutdown).
 */
export function stopGit(): void {
  if (pullTimer) {
    clearInterval(pullTimer);
    pullTimer = null;
  }
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}
