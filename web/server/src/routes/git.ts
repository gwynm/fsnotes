import { Router, type Request, type Response } from "express";
import { getSaveStatus } from "../services/git.js";

export function createGitRouter(): Router {
  const router = Router();

  router.get("/status", (_req: Request, res: Response) => {
    res.json(getSaveStatus());
  });

  return router;
}
