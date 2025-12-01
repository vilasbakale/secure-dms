import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import {
  authenticate,
  authorize,
  AuthRequest,
} from "../middleware/auth";

import {
  createUser,
  getAllUsers,
  deleteUser,
  updateUserRole,
  findUserById,
} from "../models/User";

import {
  createAuditLog,
  getAuditLogs,
} from "../models/AuditLog";

const router = Router();

/* -------------------- Format User -------------------- */
const formatUser = (user: any) => ({
  id: user.id,
  email: user.email,
  fullName: user.full_name,
  role: user.role,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

/* -------------------- GET ALL USERS (admin only) -------------------- */
router.get(
  "/",
  authenticate,
  authorize("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const users = await getAllUsers();
      res.json(users.map(formatUser));
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }
);

/* -------------------- CREATE USER (admin only) -------------------- */
router.post(
  "/",
  authenticate,
  authorize("admin"),
  [
    body("email").isEmail().normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
    body("fullName").trim().notEmpty(),
    body("role").isIn(["admin", "manager", "user"]),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { email, password, fullName, role } = req.body;

      const newUser = await createUser(email, password, fullName, role);

      await createAuditLog(
        req.user!.id,
        "CREATE_USER",
        "user",
        newUser.id,
        { email },
        req.ip
      );

      res.status(201).json(formatUser(newUser));
    } catch (error: any) {
      if (error.code === "23505") {
        return res.status(400).json({ error: "Email already exists" });
      }
      console.error("Create user error:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  }
);

/* -------------------- UPDATE USER ROLE (admin only) -------------------- */
router.put(
  "/:id/role",
  authenticate,
  authorize("admin"),
  [
    body("role").isIn(["admin", "manager", "user"]),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const existing = await findUserById(Number(id));
      if (!existing) {
        return res.status(404).json({ error: "User not found" });
      }

      const updated = await updateUserRole(Number(id), role);

      await createAuditLog(
        req.user!.id,
        "UPDATE_ROLE",
        "user",
        Number(id),
        { old: existing.role, new: role },
        req.ip
      );

      res.json(formatUser(updated));
    } catch (error) {
      console.error("Update role error:", error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  }
);

/* -------------------- DELETE USER (admin only) -------------------- */
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id);

      if (userId === req.user!.id) {
        return res
          .status(400)
          .json({ error: "Cannot delete your own account" });
      }

      const deleted = await deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }

      await createAuditLog(
        req.user!.id,
        "DELETE_USER",
        "user",
        userId,
        {},
        req.ip
      );

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);

/* -------------------- GET AUDIT LOGS (admin only) -------------------- */
router.get(
  "/audit-logs",
  authenticate,
  authorize("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const logs = await getAuditLogs(100);
      res.json(logs);
    } catch (error) {
      console.error("Get audit logs error:", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  }
);

export default router;
