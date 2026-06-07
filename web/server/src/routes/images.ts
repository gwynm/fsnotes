import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import express from "express";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);

function isImage(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

export function createImagesRouter(notesRoot: string): Router {
  const router = Router();

  // Configure multer with disk storage
  const storage = multer.diskStorage({
    destination: (_req, file, cb) => {
      const dest = isImage(file.originalname)
        ? path.join(notesRoot, "i")
        : path.join(notesRoot, "files");
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      // Generate unique filename to avoid collisions
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext);
      // Sanitize the base name
      const sanitized = base.replace(/[^a-zA-Z0-9_-]/g, "_");
      const uniqueSuffix = crypto.randomBytes(4).toString("hex");
      cb(null, `${sanitized}_${uniqueSuffix}${ext}`);
    },
  });

  const upload = multer({ storage });

  // POST /api/upload — multipart file upload
  router.post(
    "/upload",
    upload.single("file"),
    (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.file) {
          res
            .status(400)
            .json({ error: "No file uploaded", code: "NO_FILE" });
          return;
        }

        const filename = req.file.filename;
        const isImg = isImage(req.file.originalname);

        let markdown: string;
        if (isImg) {
          markdown = `![](../i/${filename})`;
        } else {
          markdown = `[${req.file.originalname}](../files/${filename})`;
        }

        res.json({ markdown });
      } catch (err) {
        next(err);
      }
    }
  );

  // GET /api/images/:filename — serve image from i/
  router.get(
    "/images/:filename",
    (_req: Request, res: Response, _next: NextFunction) => {
      const filename = _req.params.filename as string;
      const filePath = path.join(notesRoot, "i", filename);
      res.sendFile(filePath);
    }
  );

  // GET /api/files/:filename — serve file from files/
  router.get(
    "/files/:filename",
    (_req: Request, res: Response, _next: NextFunction) => {
      const filename = _req.params.filename as string;
      const filePath = path.join(notesRoot, "files", filename);
      res.sendFile(filePath);
    }
  );

  return router;
}
