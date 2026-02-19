import { z } from "zod";

import {
  emailSchema,
  strongPasswordSchema,
  usernameSchema,
  userRoleSchema,
} from "../../core/validation/schemas.js";

/**
 * =====================================================
 * Admin Validation Schemas
 * =====================================================
 *
 * Request body validation for admin user management endpoints.
 * Uses shared schemas from core/validation/schemas.js
 */

/* =====================================================
   Create User Schema
===================================================== */

export const createUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: strongPasswordSchema,
  role: userRoleSchema.default("USER"),
  isActive: z.boolean().default(true),
});

/* =====================================================
   Update User Schema
===================================================== */

export const updateUserSchema = z
  .object({
    username: usernameSchema.optional(),
    email: emailSchema.optional(),
    password: strongPasswordSchema.optional(),
    role: userRoleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

// Re-export for backward compatibility
export {
  emailSchema,
  strongPasswordSchema,
  usernameSchema,
} from "../../core/validation/schemas.js";
