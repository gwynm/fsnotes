import { Router, type Request, type Response, type NextFunction } from "express";
import {
  createNoteSchema,
  updateNoteContentSchema,
  patchNoteSchema,
} from "@fsnotes/shared/validation";
import {
  listNotes,
  getNote,
  createNote,
  updateNoteContent,
  patchNote,
  deleteNote,
} from "../services/storage.js";
import { searchNotes } from "../services/search.js";
import { markDirty } from "../services/git.js";

export function createNotesRouter(notesRoot: string): Router {
  const router = Router();

  // GET /api/notes — list notes
  router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const folder = req.query.folder as string | undefined;
      const search = req.query.search as string | undefined;
      const sort = (req.query.sort as string) || "modified";
      const dir = (req.query.dir as string) || "desc";
      const trash = req.query.trash === "true";

      // If search query, use search service
      if (search && search.trim().length > 0) {
        const results = await searchNotes(notesRoot, search);
        res.json(results);
        return;
      }

      const notes = await listNotes(notesRoot, {
        folder: folder || undefined,
        sort: sort as "modified" | "created" | "title",
        dir: dir as "asc" | "desc",
        trash,
      });

      res.json(notes);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/notes/* — get single note with content
  router.get(
    "/{*notePath}",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const notePath = (req.params as Record<string, string[]>).notePath.join("/");
        if (!notePath) {
          res.status(400).json({ error: "Note path required", code: "BAD_REQUEST" });
          return;
        }

        const note = await getNote(notesRoot, notePath);
        res.json(note);
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "ENOENT"
        ) {
          res.status(404).json({ error: "Note not found", code: "NOT_FOUND" });
          return;
        }
        next(err);
      }
    }
  );

  // POST /api/notes — create note
  router.post("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = createNoteSchema.safeParse(req.body);
      if (!result.success) {
        res.status(400).json({
          error: result.error.errors.map((e) => e.message).join(", "),
          code: "VALIDATION_ERROR",
        });
        return;
      }

      const { folder, filename, content } = result.data;
      const note = await createNote(notesRoot, folder, filename, content);
      markDirty();
      res.status(201).json(note);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "statusCode" in err
      ) {
        const e = err as { statusCode: number; message: string; code: string };
        res.status(e.statusCode).json({ error: e.message, code: e.code });
        return;
      }
      next(err);
    }
  });

  // PUT /api/notes/* — update content
  router.put(
    "/{*notePath}",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const notePath = (req.params as Record<string, string[]>).notePath.join("/");
        if (!notePath) {
          res.status(400).json({ error: "Note path required", code: "BAD_REQUEST" });
          return;
        }

        const result = updateNoteContentSchema.safeParse(req.body);
        if (!result.success) {
          res.status(400).json({
            error: result.error.errors.map((e) => e.message).join(", "),
            code: "VALIDATION_ERROR",
          });
          return;
        }

        const note = await updateNoteContent(
          notesRoot,
          notePath,
          result.data.content
        );
        markDirty();
        res.json(note);
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "ENOENT"
        ) {
          res.status(404).json({ error: "Note not found", code: "NOT_FOUND" });
          return;
        }
        next(err);
      }
    }
  );

  // PATCH /api/notes/* — rename/move
  router.patch(
    "/{*notePath}",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const notePath = (req.params as Record<string, string[]>).notePath.join("/");
        if (!notePath) {
          res.status(400).json({ error: "Note path required", code: "BAD_REQUEST" });
          return;
        }

        const result = patchNoteSchema.safeParse(req.body);
        if (!result.success) {
          res.status(400).json({
            error: result.error.errors.map((e) => e.message).join(", "),
            code: "VALIDATION_ERROR",
          });
          return;
        }

        const note = await patchNote(notesRoot, notePath, result.data);
        markDirty();
        res.json(note);
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "ENOENT"
        ) {
          res.status(404).json({ error: "Note not found", code: "NOT_FOUND" });
          return;
        }
        if (
          err &&
          typeof err === "object" &&
          "statusCode" in err
        ) {
          const e = err as { statusCode: number; message: string; code: string };
          res.status(e.statusCode).json({ error: e.message, code: e.code });
          return;
        }
        next(err);
      }
    }
  );

  // DELETE /api/notes/* — soft delete (or hard delete with ?permanent=true)
  router.delete(
    "/{*notePath}",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const notePath = (req.params as Record<string, string[]>).notePath.join("/");
        if (!notePath) {
          res.status(400).json({ error: "Note path required", code: "BAD_REQUEST" });
          return;
        }

        const permanent = req.query.permanent === "true";
        await deleteNote(notesRoot, notePath, permanent);
        markDirty();
        res.status(204).end();
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: string }).code === "ENOENT"
        ) {
          res.status(404).json({ error: "Note not found", code: "NOT_FOUND" });
          return;
        }
        next(err);
      }
    }
  );

  return router;
}
