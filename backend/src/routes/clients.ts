import { Router } from "express";
import fs from "fs";
import path from "path";
import { authenticate, authorize } from "../middleware/auth";
import { createClient, getClients, getClientById } from "../models/Client";

const router = Router();

const SUBFOLDERS = [
  "Case Documents",
  "Pleadings",
  "Evidence",
  "Court Filings",
  "Correspondence",
];

// ----------------------------------------------------
// CREATE CLIENT (ADMIN + MANAGER ONLY)
// ----------------------------------------------------
router.post(
  "/",
  authenticate,
  authorize("admin", "manager"),
  async (req, res) => {
    try {
      const { name, contactPerson, contactEmail, contactPhone, notes } =
        req.body;

      if (!name)
        return res.status(400).json({ error: "Client name is required" });

      const rootDir = process.env.STORAGE_ROOT || "/storage";

      const timestamp = new Date()
        .toISOString()
        .replace(/[-:T]/g, "")
        .split(".")[0];

      const folderName = `${name}_${timestamp}`;
      const clientFolderPath = path.join(rootDir, "Clients", folderName);

      // Create main folder
      fs.mkdirSync(clientFolderPath, { recursive: true });

      // Create subfolders
      SUBFOLDERS.forEach((sub) => {
        fs.mkdirSync(path.join(clientFolderPath, sub), { recursive: true });
      });

      // Save to DB
      const client = await createClient(
        name,
        contactPerson || null,
        contactEmail || null,
        contactPhone || null,
        clientFolderPath,
        notes || null
      );

      res.json({
        message: "Client created successfully",
        client: {
          id: client.id,
          name: client.name,
          contactPerson: client.contact_person,
          contactEmail: client.contact_email,
          contactPhone: client.contact_phone,
          folderPath: client.folder_path,
          createdAt: client.created_at.toISOString(),
        },
      });
    } catch (error) {
      console.error("Client creation error:", error);
      res.status(500).json({ error: "Failed to create client" });
    }
  }
);

// ----------------------------------------------------
// GET ALL CLIENTS (ADMIN + MANAGER + USER)
// ----------------------------------------------------
router.get(
  "/",
  authenticate,
  authorize("admin", "manager", "user"),
  async (req, res) => {
    try {
      const clients = await getClients();

      const formatted = clients.map((c) => ({
        id: c.id,
        name: c.name,
        contactPerson: c.contact_person,
        contactEmail: c.contact_email,
        contactPhone: c.contact_phone,
        folderPath: c.folder_path,
        createdAt: c.created_at.toISOString(),
      }));

      res.json(formatted);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  }
);

export default router;
