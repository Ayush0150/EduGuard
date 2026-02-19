import { z } from "zod";

/**
 * =====================================================
 * Shared Validation Schemas
 * =====================================================
 *
 * Centralized Zod schemas used across auth and admin modules.
 * Prevents duplication and ensures consistent validation rules.
 */

/* =====================================================
   Constants
===================================================== */

export const VALIDATION_LIMITS = Object.freeze({
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  EMAIL_MAX: 255,
  USERNAME_MIN: 3,
  USERNAME_MAX: 50,
  OTP_LENGTH: 6,
  OBJECT_ID_LENGTH: 24,
});

/* =====================================================
   Strong Password Schema
===================================================== */

/**
 * Enforces:
 * - minimum/maximum length
 * - uppercase & lowercase letters
 * - at least one number
 * - at least one special character
 * - protection against common weak patterns
 */
export const strongPasswordSchema = z
  .string({
    required_error: "Password is required",
    invalid_type_error: "Password must be a string",
  })
  .trim()
  .min(
    VALIDATION_LIMITS.PASSWORD_MIN,
    `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN} characters`
  )
  .max(
    VALIDATION_LIMITS.PASSWORD_MAX,
    `Password must not exceed ${VALIDATION_LIMITS.PASSWORD_MAX} characters`
  )
  .superRefine((password, ctx) => {
    const rules = [
      {
        test: /[a-z]/,
        message: "Password must include at least one lowercase letter",
      },
      {
        test: /[A-Z]/,
        message: "Password must include at least one uppercase letter",
      },
      {
        test: /\d/,
        message: "Password must include at least one number",
      },
      {
        test: /[^A-Za-z0-9]/,
        message: "Password must include at least one special character",
      },
    ];

    rules.forEach(({ test, message }) => {
      if (!test.test(password)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      }
    });

    // Prevent extremely common passwords
    const weakPatterns = [
      /^(.)\1+$/, // same character repeated
      /^12345678/i, // numeric sequence
      /^password/i, // "password"
      /^qwerty/i, // keyboard pattern
    ];

    if (weakPatterns.some((pattern) => pattern.test(password))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password is too common. Please choose a stronger password",
      });
    }
  });

/* =====================================================
   Username Schema
===================================================== */

export const usernameSchema = z
  .string({ required_error: "Username is required" })
  .trim()
  .min(
    VALIDATION_LIMITS.USERNAME_MIN,
    `Username must be at least ${VALIDATION_LIMITS.USERNAME_MIN} characters`
  )
  .max(
    VALIDATION_LIMITS.USERNAME_MAX,
    `Username must not exceed ${VALIDATION_LIMITS.USERNAME_MAX} characters`
  )
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username may contain only letters, numbers, underscores (_) and hyphens (-)"
  );

/* =====================================================
   Email Schema
===================================================== */

export const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .email("Please enter a valid email address")
  .max(VALIDATION_LIMITS.EMAIL_MAX, "Email address is too long")
  .transform((email) => email.toLowerCase());

/* =====================================================
   Identifier Schema (email or username)
===================================================== */

export const identifierSchema = z
  .string({ required_error: "Email or username is required" })
  .trim()
  .min(1, "Email or username is required")
  .max(VALIDATION_LIMITS.EMAIL_MAX, "Email or username is too long");

/* =====================================================
   OTP Schema
===================================================== */

export const otpSchema = z
  .string({ required_error: "OTP is required" })
  .trim()
  .regex(
    new RegExp(`^\\d{${VALIDATION_LIMITS.OTP_LENGTH}}$`),
    `OTP must be exactly ${VALIDATION_LIMITS.OTP_LENGTH} digits`
  );

/* =====================================================
   ObjectId Schema
===================================================== */

export const objectIdSchema = z
  .string({ required_error: "ID is required" })
  .trim()
  .length(VALIDATION_LIMITS.OBJECT_ID_LENGTH, "Invalid ID format");

/* =====================================================
   User Role Schema
===================================================== */

export const userRoleSchema = z.enum([
  "USER",
  "SECURITY",
  "MAINTENANCE",
  "PRINCIPAL",
]);

export const adminRoleSchema = z.enum(["ADMIN", "SUPER_ADMIN"]);

export const allRolesSchema = z.enum([
  "SUPER_ADMIN",
  "ADMIN",
  "SECURITY",
  "MAINTENANCE",
  "PRINCIPAL",
  "USER",
]);
