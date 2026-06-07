import express, { type Request, type Response, type NextFunction } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "./types.js";
import { ensureDirectories } from "./services/storage.js";
import { initGit, stopGit } from "./services/git.js";
import { createNotesRouter } from "./routes/notes.js";
import { createFoldersRouter } from "./routes/folders.js";
import { createGitRouter } from "./routes/git.js";
import { createImagesRouter } from "./routes/images.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const config = loadConfig();
  const app = express();

  // Ensure required directories exist
  await ensureDirectories(config.notesRoot);

  // JSON body parsing
  app.use(express.json());

  // Health endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // API routes
  app.use("/api/notes", createNotesRouter(config.notesRoot));
  app.use("/api/folders", createFoldersRouter(config.notesRoot));
  app.use("/api/git", createGitRouter());

  // Upload and file serving routes (mounted at /api)
  const imagesRouter = createImagesRouter(config.notesRoot);
  app.use("/api", imagesRouter);

  // In production, serve the client build
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));

  // SPA fallback: serve index.html for non-API routes
  app.get("{*splat}", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }
    res.sendFile(path.join(clientDist, "index.html"), (err) => {
      if (err) {
        // In dev mode, client dist won't exist — that's fine
        next();
      }
    });
  });

  // Global error handler
  app.use(
    (err: Error & { statusCode?: number; code?: string }, _req: Request, res: Response, _next: NextFunction) => {
      console.error("[error]", err);
      const status = err.statusCode || 500;
      res.status(status).json({
        error: err.message || "Internal server error",
        code: err.code || "INTERNAL_ERROR",
      });
    }
  );

  // Initialize git service
  await initGit(config.notesRoot, {
    autoCommitSecs: config.gitAutoCommitSecs,
    autoPullSecs: config.gitAutoPullSecs,
    sshKey: config.gitSshKey,
  });

  // Start server
  app.listen(config.port, () => {
    console.log(`[server] FSNotes Web running on port ${config.port}`);
    console.log(`[server] NOTES_ROOT: ${config.notesRoot}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("[server] Shutting down...");
    stopGit();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[server] Fatal error:", err);
  process.exit(1);
});
