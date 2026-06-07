import { Router } from "express";
import { getGitStatus } from "../services/git.js";
export function createGitRouter() {
    const router = Router();
    // GET /api/git/status — get git status
    router.get("/status", async (_req, res, next) => {
        try {
            const status = await getGitStatus();
            res.json(status);
        }
        catch (err) {
            next(err);
        }
    });
    return router;
}
//# sourceMappingURL=git.js.map