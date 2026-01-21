import { z } from "zod";

/* =====================================================
   Shared Constants
===================================================== */

const MAX_PASSWORD_LENGTH = 128;
const MAX_EMAIL_LENGTH = 255;
const MAX_USERNAME_LENGTH = 50;

/* =====================================================
   Strong Password Schema
===================================================== */

export const strongPasswordSchema = z
  .string({ required_error: "Password is required" })
  .trim()
  .min(8, "Password must be at least 8 characters long")
  .max(
    MAX_PASSWORD_LENGTH,
    `Password must not exceed ${MAX_PASSWORD_LENGTH} characters`
  )
  .superRefine((password, ctx) => {
    const value = String(password ?? "");

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
      if (!test.test(value)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
        });
      }
    });

    const weakPatterns = [
      /^(.)\1+$/, // same character repeated
      /^12345678/,
      /^password/i,
      /^qwerty/i,
    ];

    if (weakPatterns.some((pattern) => pattern.test(value))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Password is too weak or commonly used. Please choose a stronger password.",
      });
    }
  });

/* =====================================================
   Username Schema
===================================================== */

export const usernameSchema = z
  .string({ required_error: "Username is required" })
  .trim()
  .min(3, "Username must be at least 3 characters long")
  .max(
    MAX_USERNAME_LENGTH,
    `Username must not exceed ${MAX_USERNAME_LENGTH} characters`
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
  .max(MAX_EMAIL_LENGTH, "Email address is too long")
  .transform((email) => email.toLowerCase());

/* =====================================================
   Create User Schema
===================================================== */

export const createUserSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: strongPasswordSchema,
  role: z
    .enum(["USER", "SECURITY", "MAINTENANCE", "PRINCIPAL"])
    .default("USER"),
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
    role: z.enum(["USER", "SECURITY", "MAINTENANCE", "PRINCIPAL"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });
