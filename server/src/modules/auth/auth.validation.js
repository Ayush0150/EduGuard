import { z } from "zod";

/**
 * Strong password schema with comprehensive validation
 */
export const strongPasswordSchema = z
  .string({ required_error: "Password is required" })
  .trim()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .superRefine((password, ctx) => {
    if (!/[a-z]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must include at least one lowercase letter",
      });
    }

    if (!/[A-Z]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must include at least one uppercase letter",
      });
    }

    if (!/\d/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password must include at least one number",
      });
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
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
        message: "Password is too common. Please choose a stronger password",
      });
    }
  });

/**
 * Login schema with strict validation
 */
export const loginSchema = z.object({
  identifier: z
    .string({ required_error: "Email or username is required" })
    .trim()
    .min(1, "Email or username is required")
    .max(255, "Email or username is too long"),

  password: z
    .string({ required_error: "Password is required" })
    .trim()
    .min(1, "Password is required")
    .max(128, "Password is too long"),

  remember: z.boolean().optional().default(false),
});

/**
 * Request OTP schema with email validation
 */
export const requestOtpSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email is too long")
    .transform((val) => val.toLowerCase()),
});

/**
 * Verify OTP schema with strict 6-digit validation
 */
export const verifyOtpSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email is too long")
    .transform((val) => val.toLowerCase()),

  otp: z
    .string({ required_error: "OTP is required" })
    .trim()
    .regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
});

/**
 * Reset password schema with token and password validation
 */
export const resetPasswordSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Please enter a valid email address")
    .max(255, "Email is too long")
    .transform((val) => val.toLowerCase()),

  resetToken: z
    .string({ required_error: "Reset token is required" })
    .trim()
    .min(32, "Invalid reset token")
    .max(128, "Invalid reset token"),

  newPassword: strongPasswordSchema,
});
