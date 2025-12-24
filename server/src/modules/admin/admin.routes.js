import { Router } from "express";
import { requireAuth, requireRole } from "../../core/middlewares/auth.js";
import { postCreateUser } from "./admin.controller.js";
import { createUserSchema } from "./admin.validation.js";

function validate(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      }));

      return res.status(400).json({
        success: false,
        message: errors[0]?.message ?? "Validation error",
        errors,
      });
    }
    req.body = parsed.data;
    next();
  };
}

export const adminRouter = Router();

adminRouter.post(
  "/users",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  validate(createUserSchema),
  postCreateUser
);
