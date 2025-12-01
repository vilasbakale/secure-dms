import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticate, authorize } from "../middleware/auth";
import { getClientById } from "../models/Client";

const router = Router();

/**
 * Multer config - temporary file storage
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "/tmp"),
  filename: (_req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

/**
 * Safe file stat
 */
function safeStat(p: string): fs.Stats | null {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

/**
 * GET /folders/:clientId
 * Return list of folders under the client's folder_path
 */
router.get(
  "/folders/:clientId",
  authenticate,
  authorize("admin", "manager"),
  async (req: any, res) => {
    try {
      const clientId = Number(req.params.clientId);
      const client = await getClientById(clientId);
      if (!client) return res.status(404).json({ error: "Client not found" });

      const base = client.folder_path;
      if (!base) return res.status(500).json({ error: "Client folder_path missing" });

      if (!fs.existsSync(base)) return res.status(404).json({ error: "Client folder missing" });

      const entries = fs.readdirSync(base, { withFileTypes: true });
      const folders = entries.filter(x => x.isDirectory()).map(x => x.name);

      return res.json({ clientId, folders });
    } catch (err) {
      console.error("GET /folders error:", err);
      return res.status(500).json({ error: "Failed to list folders" });
    }
  }
);

/**
 * GET /list/:clientId?folder=...
 * List files in a specific folder
 */
router.get(
  "/list/:clientId",
  authenticate,
  authorize("admin", "manager"),
  async (req: any, res) => {
    try {
      const clientId = Number(req.params.clientId);
      const folder = String(req.query.folder || "").trim();
      if (!folder) return res.status(400).json({ error: "Folder is required" });

      const client = await getClientById(clientId);
      if (!client) return res.status(404).json({ error: "Client not found" });

      const base = client.folder_path;
      const target = path.join(base, folder);

      if (!fs.existsSync(target)) return res.status(404).json({ error: "Folder not found" });

      const items = fs.readdirSync(target, { withFileTypes: true }).filter(f => f.isFile());

      const files = items.map(f => {
        const full = path.join(target, f.name);
        const stat = safeStat(full);
        return {
          name: f.name,
          size: stat?.size || 0,
          modified: stat?.mtime.toISOString() || null
        };
      });

      return res.json({ clientId, folder, files });
    } catch (err) {
      console.error("List error:", err);
      return res.status(500).json({ error: "Failed to list files" });
    }
  }
);

/**
 * GET /search/:clientId?query=...
 * Search across ALL folders under a client
 */
router.get(
  "/search/:clientId",
  authenticate,
  authorize("admin", "manager"),
  async (req: any, res) => {
    try {
      const query = String(req.query.query || "").toLowerCase().trim();
      if (!query) return res.status(400).json({ error: "Search query missing" });

      const clientId = Number(req.params.clientId);
      const client = await getClientById(clientId);
      if (!client) return res.status(404).json({ error: "Client not found" });

      const base = client.folder_path;
      const folders = fs.readdirSync(base, { withFileTypes: true })
        .filter(f => f.isDirectory())
        .map(f => f.name);

      const results: any[] = [];

      for (const folder of folders) {
        const folderPath = path.join(base, folder);
        const files = fs.readdirSync(folderPath, { withFileTypes: true })
          .filter(f => f.isFile());

        for (const f of files) {
          if (f.name.toLowerCase().includes(query)) {
            const full = path.join(folderPath, f.name);
            const stat = safeStat(full);
            results.push({
              folder,
              name: f.name,
              size: stat?.size || 0,
              modified: stat?.mtime.toISOString() || null
            });
          }
        }
      }

      return res.json({ results });
    } catch (err) {
      console.error("Search error:", err);
      return res.status(500).json({ error: "Search failed" });
    }
  }
);

/**
 * Prepare upload directory
 */
async function prepareUploadPath(req: any, res: any, next: any) {
  try {
    const clientId = Number(req.params.clientId);
    const folder = req.body.folder;

    const client = await getClientById(clientId);
    const base = client.folder_path;

    const target = path.join(base, folder);
    fs.mkdirSync(target, { recursive: true });

    req.uploadPath = target;
    next();
  } catch (err) {
    console.error("prepareUploadPath error:", err);
    return res.status(500).json({ error: "Failed to prepare upload path" });
  }
}

/**
 * POST /upload/:clientId
 * Upload with versioning
 */
router.post(
  "/upload/:clientId",
  authenticate,
  authorize("admin", "manager"),
  upload.single("file"),
  prepareUploadPath,
  (req: any, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const dir = req.uploadPath;
      const originalName = req.file.originalname;
      const ext = path.extname(originalName);
      const base = path.basename(originalName, ext);

      let finalName = originalName;
      let finalPath = path.join(dir, finalName);
      let version = 2;

      while (fs.existsSync(finalPath)) {
        finalName = `${base}_v${version}${ext}`;
        finalPath = path.join(dir, finalName);
        version++;
      }

      fs.copyFileSync(req.file.path, finalPath);
      fs.unlinkSync(req.file.path);

      return res.json({
        message: "Uploaded successfully",
        stored_as: finalName,
        version: version - 1
      });
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ error: "Upload failed" });
    }
  }
);

/**
 * GET /download/:clientId?folder=...&file=...
 * Send file to user
 */
router.get(
  "/download/:clientId",
  authenticate,
  authorize("admin", "manager"),
  async (req: any, res) => {
    try {
      const clientId = Number(req.params.clientId);
      const folder = String(req.query.folder);
      const file = String(req.query.file);

      const client = await getClientById(clientId);
      const base = client.folder_path;

      const filePath = path.join(base, folder, file);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      return res.download(filePath, file);
    } catch (err) {
      console.error("Download error:", err);
      return res.status(500).json({ error: "Download failed" });
    }
  }
);

export default router;
