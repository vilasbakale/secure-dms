// src/routes/files.ts
import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import PDFDocument from "pdfkit";
import sharp from "sharp";

import { authenticate, authorize } from "../middleware/auth";
import { getClientById } from "../models/Client";

const router = Router();

// Memory storage for multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 50, fileSize: 60 * 1024 * 1024 },
});

/* -------------------- helpers -------------------- */
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

function getVersionedName(dir: string, baseName: string) {
  const ext = path.extname(baseName);
  const name = path.basename(baseName, ext);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const regex = new RegExp(`^${name}(?:_v(\\d+))?\\${ext}$`);
  let maxV = -1;

  for (const f of files) {
    const m = f.match(regex);
    if (m) {
      const v = m[1] ? parseInt(m[1], 10) : 0;
      if (v > maxV) maxV = v;
    }
  }

  if (maxV === -1 && !files.includes(baseName)) return baseName;

  return `${name}_v${maxV + 1}${ext}`;
}

/* -------------------- folders (READ: all roles) -------------------- */
router.get(
  "/folders/:clientId",
  authenticate,
  authorize("admin", "manager", "user"),
  async (req: any, res) => {
    try {
      const client = await getClientById(Number(req.params.clientId));
      if (!client) return res.status(404).json({ error: "Client not found" });

      const baseDir = client.folder_path;
      if (!baseDir || !fs.existsSync(baseDir)) return res.json({ folders: [] });

      const folders = fs
        .readdirSync(baseDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      res.json({ folders });
    } catch (err) {
      console.error("FOLDERS ERROR:", err);
      res.status(500).json({ error: "Failed to load folders" });
    }
  }
);

/* -------------------- list files (READ: all roles) -------------------- */
router.get(
  "/list/:clientId",
  authenticate,
  authorize("admin", "manager", "user"),
  async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const { folder } = req.query;

      const client = await getClientById(Number(clientId));
      if (!client) return res.status(404).json({ error: "Client not found" });

      const folderPath = path.join(client.folder_path, String(folder || ""));
      if (!fs.existsSync(folderPath)) return res.json({ files: [] });

      const files = fs.readdirSync(folderPath).map((name) => {
        const full = path.join(folderPath, name);
        const stat = fs.statSync(full);
        return {
          name,
          size: stat.size,
          modified: stat.mtime,
        };
      });

      res.json({ files });
    } catch (err) {
      console.error("LIST FILES ERROR:", err);
      res.status(500).json({ error: "Failed to load files" });
    }
  }
);

/* -------------------- search (READ: all roles) -------------------- */
router.get(
  "/search/:clientId",
  authenticate,
  authorize("admin", "manager", "user"),
  async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const { query } = req.query;

      const client = await getClientById(Number(clientId));
      if (!client) return res.status(404).json({ error: "Client not found" });

      const baseDir = client.folder_path;
      if (!baseDir || !fs.existsSync(baseDir)) return res.json({ results: [] });

      const results: any[] = [];

      const folderNames = fs
        .readdirSync(baseDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const folder of folderNames) {
        const folderPath = path.join(baseDir, folder);
        const items = fs.readdirSync(folderPath);

        for (const file of items) {
          if (String(file).toLowerCase().includes(String(query || "").toLowerCase())) {
            const stat = fs.statSync(path.join(folderPath, file));
            results.push({
              name: file,
              folder,
              size: stat.size,
              modified: stat.mtime,
            });
          }
        }
      }

      res.json({ results });
    } catch (err) {
      console.error("SEARCH ERROR:", err);
      res.status(500).json({ error: "Search failed" });
    }
  }
);

/* -------------------- upload file (WRITE: all roles including user) -------------------- */
router.post(
  "/upload/:clientId",
  authenticate,
  authorize("admin", "manager", "user"),
  upload.single("file"),
  async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const { folder } = req.body;

      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      if (!folder) return res.status(400).json({ error: "Missing folder" });

      const client = await getClientById(Number(clientId));
      if (!client) return res.status(404).json({ error: "Client not found" });

      const targetDir = path.join(client.folder_path, folder);
      ensureDir(targetDir);

      const destName = getVersionedName(targetDir, req.file.originalname);
      const destPath = path.join(targetDir, destName);

      fs.writeFileSync(destPath, req.file.buffer);

      res.json({ message: "Uploaded", file: destName });
    } catch (err) {
      console.error("UPLOAD ERROR:", err);
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

/* -------------------- download (READ: all roles) -------------------- */
router.get(
  "/download/:clientId",
  authenticate,
  authorize("admin", "manager", "user"),
  async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const { folder, file } = req.query;

      const client = await getClientById(Number(clientId));
      if (!client) return res.status(404).json({ error: "Client not found" });

      const filePath = path.join(client.folder_path, String(folder || ""), String(file || ""));
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Not found" });

      res.download(filePath);
    } catch (err) {
      console.error("DOWNLOAD ERROR:", err);
      res.status(500).json({ error: "Download failed" });
    }
  }
);

/* -------------------- scan-upload (WRITE: all roles including user) -------------------- */
router.post(
  "/scan-upload/:clientId",
  authenticate,
  authorize("admin", "manager", "user"),
  upload.array("images", 50),
  async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const folder = req.body.folder;
      const saveOriginals = req.body.saveOriginals !== "false";

      if (!folder) return res.status(400).json({ error: "Missing folder" });

      const client = await getClientById(Number(clientId));
      if (!client) return res.status(404).json({ error: "Client not found" });

      const targetDir = path.join(client.folder_path, folder);
      ensureDir(targetDir);

      const files = (req.files || []) as Express.Multer.File[];
      if (!files.length) return res.status(400).json({ error: "No images uploaded" });

      // Convert images → PNG buffers
      const pngBuffers: Buffer[] = [];
      for (const f of files) {
        const png = await sharp(f.buffer).png().toBuffer();
        pngBuffers.push(png);
      }

      // Create PDF
      const basePdfName = "ScannedDocument.pdf";
      const pdfName = getVersionedName(targetDir, basePdfName);
      const pdfPath = path.join(targetDir, pdfName);

      const doc = new PDFDocument({ autoFirstPage: false });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      for (const png of pngBuffers) {
        const meta = await sharp(png).metadata();
        const width = meta.width || 595;
        const height = meta.height || 842;

        doc.addPage({ size: [width, height] });
        doc.image(png, 0, 0, { width, height });
      }

      doc.end();

      await new Promise<void>((resolve, reject) => {
        stream.on("finish", resolve);
        stream.on("error", reject);
      });

      // Save originals (if enabled)
      const originals: string[] = [];
      if (saveOriginals) {
        for (const f of files) {
          const fname = getVersionedName(targetDir, f.originalname);
          fs.writeFileSync(path.join(targetDir, fname), f.buffer);
          originals.push(fname);
        }
      }

      res.json({
        message: "Scans converted and uploaded",
        pdf: pdfName,
        originals,
      });
    } catch (err) {
      console.error("SCAN-UPLOAD ERROR:", err);
      res.status(500).json({ error: "Failed to convert/upload scanned images" });
    }
  }
);

/* -------------------- rename (WRITE: all roles including user) -------------------- */
router.post(
  "/rename/:clientId",
  authenticate,
  authorize("admin", "manager", "user"),
  async (req: any, res) => {
    try {
      const { clientId } = req.params;
      const { folder, oldName, newName } = req.body;

      if (!folder || !oldName || !newName) {
        return res.status(400).json({ error: "Missing folder, oldName or newName" });
      }

      const client = await getClientById(Number(clientId));
      if (!client) return res.status(404).json({ error: "Client not found" });

      const targetDir = path.join(client.folder_path, folder);
      const oldPath = path.join(targetDir, oldName);

      if (!fs.existsSync(oldPath)) {
        return res.status(404).json({ error: "Source file not found" });
      }

      const desiredName = newName.endsWith(".pdf") ? newName : `${newName}.pdf`;
      const finalName = getVersionedName(targetDir, desiredName);

      const newPath = path.join(targetDir, finalName);

      try {
        fs.renameSync(oldPath, newPath);
      } catch (err: any) {
        if (err.code === "EXDEV") {
          fs.copyFileSync(oldPath, newPath);
          fs.unlinkSync(oldPath);
        } else {
          throw err;
        }
      }

      res.json({ message: "Renamed", finalName });
    } catch (err) {
      console.error("RENAME ERROR:", err);
      res.status(500).json({ error: "Rename failed" });
    }
  }
);

export default router;
