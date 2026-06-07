import { Router, type Request, type Response, type NextFunction } from "express";
import {
  createFolderSchema,
  renameFolderSchema,
} from "@fsnotes/shared/validation";
import {
  listFolders,
  createFolder,
  renameFolder,
  deleteFolder,
} from "../services/storage.js";

export function createFoldersRouter(notesRoot: string): Router {
  const router = Router();

  // GET /api/folders — list folders with note counts
  router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const folders = await listFolders(notesRoot);
      res.json(folders);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/folders — create folder
  router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = createFolderSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: result.error.errors.map((e) => e.message).join(", "),
          code: "VALIDATION_ERROR",
        });
        return;
      }

      const folder = await createFolder(notesRoot, result.data.name);
      res.status(201).json(folder);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "statusCode" in err) {
        const e = err as { statusCode: number; message: string; code: string };
        res.status(e.statusCode).json({ error: e.message, code: e.code });
        return;
      }
      next(err);
    }
  });

  // PATCH /api/folders/:name — rename folder
  router.patch(
    "/:name",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const oldName = req.params.name as string;

        const result = renameFolderSchema.safeParse(req.body);
        if (!result.success) {
          res.status(400).json({
            error: result.error.errors.map((e) => e.message).join(", "),
            code: "VALIDATION_ERROR",
          });
          return;
        }

        const folder = await renameFolder(notesRoot, oldName, result.data.name);
        res.json(folder);
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "ENOENT"
        ) {
          res
            .status(404)
            .json({ error: "Folder not found", code: "NOT_FOUND" });
          return;
        }
        if (err && typeof err === "object" && "statusCode" in err) {
          const e = err as {
            statusCode: number;
            message: string;
            code: string;
          };
          res.status(e.statusCode).json({ error: e.message, code: e.code });
          return;
        }
        next(err);
      }
    }
  );

  // DELETE /api/folders/:name — delete folder
  router.delete(
    "/:name",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const name = req.params.name as string;
        await deleteFolder(notesRoot, name);
        res.status(204).end();
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "ENOENT"
        ) {
          res
            .status(404)
            .json({ error: "Folder not found", code: "NOT_FOUND" });
          return;
        }
        if (err && typeof err === "object" && "statusCode" in err) {
          const e = err as {
            statusCode: number;
            message: string;
            code: string;
          };
          res.status(e.statusCode).json({ error: e.message, code: e.code });
          return;
        }
        next(err);
      }
    }
  );

  return router;
}
