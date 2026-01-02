import { Router } from "express";
import { env } from "../../core/config/env.js";
import { requireAuth, requireRole } from "../../core/middlewares/auth.js";
import { validateBody } from "../../core/middlewares/validate.js";
import { User } from "../users/user.model.js";
import {
  deleteUserById,
  getUser,
  getUsers,
  patchToggleUserStatus,
  postCreateUser,
  putUpdateUser,
} from "./admin.controller.js";
import { createUserSchema, updateUserSchema } from "./admin.validation.js";

export const adminRouter = Router();

async function requireSuperAdminEmail(req, res, next) {
  if (!env.superAdminEmail) return next();

  try {
    const user = await User.findById(req.user?.id)
      .select("email isActive")
      .lean();

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const email = String(user.email ?? "")
      .trim()
      .toLowerCase();
    if (email !== env.superAdminEmail) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

// Base path (mounted in app): /api/v1/admin
adminRouter.use(
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  requireSuperAdminEmail
);

adminRouter.get("/users", getUsers);
adminRouter.get("/users/:id", getUser);
adminRouter.post("/users", validateBody(createUserSchema), postCreateUser);
adminRouter.put("/users/:id", validateBody(updateUserSchema), putUpdateUser);
adminRouter.delete("/users/:id", deleteUserById);
adminRouter.patch("/users/:id/toggle", patchToggleUserStatus);
