import { z } from "zod";

/**
 * Strong password schema with comprehensive validation
 */
const strongPasswordSchema = z
  .string({ required_error: "Password is required" })
  .trim()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .superRefine((val, ctx) => {
    const password = String(val ?? "");

    if (!/[a-z]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must include at least one lowercase letter",
      });
    }

    if (!/[A-Z]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must include at least one uppercase letter",
      });
    }

    if (!/\d/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must include at least one number",
      });
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must include at least one special character",
      });
    }

    // Check for common patterns
    const commonPatterns = [
      /^(.)\1+$/, // All same character
      /^12345678/, // Sequential numbers
      /^password/i, // Contains "password"
      /^qwerty/i, // Contains "qwerty"
    ];

    if (commonPatterns.some((pattern) => pattern.test(password))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password is too common. Please choose a stronger password",
      });
    }
  });

/**
 * Username validation schema
 */
const usernameSchema = z
  .string({ required_error: "Username is required" })
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(50, "Username must not exceed 50 characters")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens"
  );

/**
 * Email validation schema
 */
const emailSchema = z
  .string({ required_error: "Email is required" })
  .trim()
  .email("Please enter a valid email address")
  .max(255, "Email is too long")
  .transform((val) => val.toLowerCase());

/**
 * Create user schema with strict validation
 */
export const createUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: strongPasswordSchema,
  role: z
    .enum(["USER", "SECURITY", "MAINTENANCE", "PRINCIPAL"])
    .optional()
    .default("USER"),
  isActive: z.boolean().optional().default(true),
});

/**
 * Update user schema with partial validation
 */
export const updateUserSchema = z
  .object({
    username: usernameSchema.optional(),
    email: emailSchema.optional(),
    password: strongPasswordSchema.optional(),
    role: z.enum(["USER", "SECURITY", "MAINTENANCE", "PRINCIPAL"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: "At least one field must be provided for update",
  });
