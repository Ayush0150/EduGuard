import { z } from "zod";

/**
 * =====================================================
 * EduGuard Authentication Validation Schemas
 * =====================================================
 *
 * All schemas defined here are used for:
 * - request body validation
 * - API input protection
 * - early error detection
 *
 * ⚠️ Frontend validation improves UX only.
 * Backend validation is the source of truth.
 */

/* =====================================================
   Constants
===================================================== */

const MAX_EMAIL_LENGTH = 255;
const MAX_PASSWORD_LENGTH = 128;
const MIN_PASSWORD_LENGTH = 8;
const OTP_LENGTH = 6;

/* =====================================================
   Shared Validators
===================================================== */

/**
 * Strong password validator
 *
 * Enforces:
 * - minimum length
 * - uppercase & lowercase
 * - number
 * - special character
 * - protection against common weak patterns
 */
export const strongPasswordSchema = z
  .string({
    required_error: "Password is required",
    invalid_type_error: "Password must be a string",
  })
  .trim()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `Password must not exceed ${MAX_PASSWORD_LENGTH} characters`)
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
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
        });
      }
    });

    // Prevent extremely common passwords
    const weakPatterns = [
      /^(.)\1+$/,        // same character repeated
      /^123456/i,        // numeric sequence
      /^password/i,      // "password"
      /^qwerty/i,        // keyboard pattern
    ];

    if (weakPatterns.some((pattern) => pattern.test(password))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Password is too common. Please choose a stronger password",
      });
    }
  });

/* =====================================================
   Login Schema
===================================================== */

export const loginSchema = z.object({
  identifier: z
    .string({
      required_error: "Email or username is required",
    })
    .trim()
    .min(1, "Email or username is required")
    .max(MAX_EMAIL_LENGTH, "Email or username is too long"),

  password: z
    .string({
      required_error: "Password is required",
    })
    .trim()
    .min(1, "Password is required")
    .max(MAX_PASSWORD_LENGTH, "Password is too long"),

  remember: z.boolean().optional().default(false),
});

/* =====================================================
   Request OTP Schema
===================================================== */

export const requestOtpSchema = z.object({
  email: z
    .string({
      required_error: "Email is required",
    })
    .trim()
    .email("Please enter a valid email address")
    .max(MAX_EMAIL_LENGTH, "Email is too long")
    .transform((value) => value.toLowerCase()),
});

/* =====================================================
   Verify OTP Schema
===================================================== */

export const verifyOtpSchema = z.object({
  email: z
    .string({
      required_error: "Email is required",
    })
    .trim()
    .email("Please enter a valid email address")
    .max(MAX_EMAIL_LENGTH, "Email is too long")
    .transform((value) => value.toLowerCase()),

  otp: z
    .string({
      required_error: "OTP is required",
    })
    .trim()
    .regex(
      new RegExp(`^\\d{${OTP_LENGTH}}$`),
      `OTP must be exactly ${OTP_LENGTH} digits`
    ),
});

/* =====================================================
   Reset Password Schema
===================================================== */

export const resetPasswordSchema = z.object({
  email: z
    .string({
      required_error: "Email is required",
    })
    .trim()
    .email("Please enter a valid email address")
    .max(MAX_EMAIL_LENGTH, "Email is too long")
    .transform((value) => value.toLowerCase()),

  resetToken: z
    .string({
      required_error: "Reset token is required",
    })
    .trim()
    .min(32, "Invalid or expired reset token")
    .max(128, "Invalid or expired reset token"),

  newPassword: strongPasswordSchema,
});
