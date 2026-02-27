import { Router } from "express";

import { env } from "../../core/config/env.js";
import { requireAuth, requireRole } from "../../core/middlewares/auth.js";
import {
  validateBody,
  validateObjectIdParam,
} from "../../core/middlewares/validate.js";
import { User } from "../users/user.model.js";

import {
  deleteUserById,
  getUser,
  getUsers,
  patchToggleUserStatus,
  postCreateUser,
  putUpdateUser,
} from "./admin.controller.js";

import {
  deleteSmsCounterByDevice,
  getAllSmsCounters,
  getSmsCounterByDevice,
  putSmsCounter,
} from "../sms/smsCounter.controller.js";
import { createUserSchema, updateUserSchema } from "./admin.validation.js";

export const adminRouter = Router();

/**
 * =====================================================
 * Admin Route Protection
 * =====================================================
 *
 * Rules:
 * - Must be authenticated
 * - Must have ADMIN or SUPER_ADMIN role
 * - If SUPER_ADMIN_EMAIL is defined:
 *     → Only that email may access admin APIs
 */

/* -----------------------------------------------------
   SUPER ADMIN EMAIL GUARD
----------------------------------------------------- */

async function requireSuperAdmin(req, res, next) {
  if (!env.superAdminEmail) return next();

  try {
    const user = await User.findById(req.user?.id)
      .select("email isActive")
      .lean();

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const email = String(user.email ?? "")
      .trim()
      .toLowerCase();

    if (email !== env.superAdminEmail) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

/* -----------------------------------------------------
   GLOBAL ADMIN MIDDLEWARE
----------------------------------------------------- */

adminRouter.use(
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  requireSuperAdmin
);

/* =====================================================
   USER MANAGEMENT ROUTES
===================================================== */

/**
 * GET /api/v1/admin/users
 * List all users
 */
adminRouter.get("/users", getUsers);

/**
 * GET /api/v1/admin/users/:id
 * Get single user by ID
 */
adminRouter.get("/users/:id", validateObjectIdParam("id"), getUser);

/**
 * POST /api/v1/admin/users
 * Create new user
 */
adminRouter.post("/users", validateBody(createUserSchema), postCreateUser);

/**
 * PUT /api/v1/admin/users/:id
 * Update user
 */
adminRouter.put(
  "/users/:id",
  validateObjectIdParam("id"),
  validateBody(updateUserSchema),
  putUpdateUser
);

/**
 * DELETE /api/v1/admin/users/:id
 * Permanently delete user
 */
adminRouter.delete("/users/:id", validateObjectIdParam("id"), deleteUserById);

/**
 * PATCH /api/v1/admin/users/:id/status
 * Enable or disable user account
 */
adminRouter.patch(
  "/users/:id/status",
  validateObjectIdParam("id"),
  patchToggleUserStatus
);

/**
 * GET /api/v1/admin/sms-counters
 * List all SMS counters by device
 */
adminRouter.get("/sms-counters", getAllSmsCounters);

/**
 * GET /api/v1/admin/sms-counters/:device
 * Get one device SMS counters
 */
adminRouter.get("/sms-counters/:device", getSmsCounterByDevice);

/**
 * PUT /api/v1/admin/sms-counters/:device
 * Insert/update one device SMS counters
 * body: { smsToday: number, smsMonth: number }
 */
adminRouter.put("/sms-counters/:device", putSmsCounter);

/**
 * DELETE /api/v1/admin/sms-counters/:device
 * Delete one device SMS counters
 */
adminRouter.delete("/sms-counters/:device", deleteSmsCounterByDevice);
