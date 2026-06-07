import { Router } from "express";
import { createFolderSchema, renameFolderSchema, } from "@fsnotes/shared/validation";
import { listFolders, createFolder, renameFolder, deleteFolder, } from "../services/storage.js";
export function createFoldersRouter(notesRoot) {
    const router = Router();
    // GET /api/folders — list folders with note counts
    router.get("/", async (_req, res, next) => {
        try {
            const folders = await listFolders(notesRoot);
            res.json(folders);
        }
        catch (err) {
            next(err);
        }
    });
    // POST /api/folders — create folder
    router.post("/", async (req, res, next) => {
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
        }
        catch (err) {
            if (err && typeof err === "object" && "statusCode" in err) {
                const e = err;
                res.status(e.statusCode).json({ error: e.message, code: e.code });
                return;
            }
            next(err);
        }
    });
    // PATCH /api/folders/:name — rename folder
    router.patch("/:name", async (req, res, next) => {
        try {
            const oldName = req.params.name;
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
        }
        catch (err) {
            if (err &&
                typeof err === "object" &&
                "code" in err &&
                err.code === "ENOENT") {
                res
                    .status(404)
                    .json({ error: "Folder not found", code: "NOT_FOUND" });
                return;
            }
            if (err && typeof err === "object" && "statusCode" in err) {
                const e = err;
                res.status(e.statusCode).json({ error: e.message, code: e.code });
                return;
            }
            next(err);
        }
    });
    // DELETE /api/folders/:name — delete folder
    router.delete("/:name", async (req, res, next) => {
        try {
            const name = req.params.name;
            await deleteFolder(notesRoot, name);
            res.status(204).end();
        }
        catch (err) {
            if (err &&
                typeof err === "object" &&
                "code" in err &&
                err.code === "ENOENT") {
                res
                    .status(404)
                    .json({ error: "Folder not found", code: "NOT_FOUND" });
                return;
            }
            if (err && typeof err === "object" && "statusCode" in err) {
                const e = err;
                res.status(e.statusCode).json({ error: e.message, code: e.code });
                return;
            }
            next(err);
        }
    });
    return router;
}
//# sourceMappingURL=folders.js.map