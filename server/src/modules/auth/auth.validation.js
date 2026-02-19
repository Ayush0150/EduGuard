import { z } from "zod";

import {
  identifierSchema,
  objectIdSchema,
  otpSchema,
  strongPasswordSchema,
  VALIDATION_LIMITS,
} from "../../core/validation/schemas.js";

/**
 * =====================================================
 * Authentication Validation Schemas
 * =====================================================
 *
 * Request body validation for auth endpoints.
 * Uses shared schemas from core/validation/schemas.js
 */

/* =====================================================
   Login Schema
===================================================== */

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z
    .string({ required_error: "Password is required" })
    .trim()
    .min(1, "Password is required")
    .max(VALIDATION_LIMITS.PASSWORD_MAX, "Password is too long"),
  remember: z.boolean().optional().default(false),
});

/* =====================================================
   Request OTP Schema
===================================================== */

export const requestOtpSchema = z
  .object({
    identifier: identifierSchema.optional(),
    email: z.string().trim().optional(),
  })
  .refine((data) => data.identifier || data.email, {
    message: "Email or username is required",
    path: ["identifier"],
  })
  .transform((data) => ({
    identifier: (data.identifier ?? data.email ?? "").trim(),
  }));

/* =====================================================
   Verify OTP Schema
===================================================== */

export const verifyOtpSchema = z
  .object({
    identifier: identifierSchema.optional(),
    email: z.string().trim().optional(),
    otp: otpSchema,
  })
  .refine((data) => data.identifier || data.email, {
    message: "Email or username is required",
    path: ["identifier"],
  })
  .transform((data) => ({
    identifier: (data.identifier ?? data.email ?? "").trim(),
    otp: data.otp,
  }));

/* =====================================================
   Admin Login Verify OTP Schema
===================================================== */

export const adminLoginVerifyOtpSchema = z.object({
  adminId: objectIdSchema,
  otp: otpSchema,
});

/* =====================================================
   Resend Admin Login OTP Schema
===================================================== */

export const resendAdminOtpSchema = z.object({
  adminId: objectIdSchema,
});

/* =====================================================
   Reset Password Schema
===================================================== */

export const resetPasswordSchema = z
  .object({
    identifier: identifierSchema.optional(),
    email: z.string().trim().optional(),
    resetToken: z
      .string({ required_error: "Reset token is required" })
      .trim()
      .min(32, "Invalid or expired reset token")
      .max(128, "Invalid or expired reset token"),
    newPassword: strongPasswordSchema,
  })
  .refine((data) => data.identifier || data.email, {
    message: "Email or username is required",
    path: ["identifier"],
  })
  .transform((data) => ({
    identifier: (data.identifier ?? data.email ?? "").trim(),
    resetToken: data.resetToken,
    newPassword: data.newPassword,
  }));

// Re-export for backward compatibility
export { strongPasswordSchema } from "../../core/validation/schemas.js";
