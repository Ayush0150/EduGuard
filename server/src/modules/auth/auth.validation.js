import { z } from "zod";

export const strongPasswordSchema = z
  .string({ required_error: "New password is required" })
  .min(8, "Password must be at least 8 characters")
  .superRefine((val, ctx) => {
    const password = String(val ?? "");
    if (!/[a-z]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Password must include a lowercase letter",
      });
    }
    if (!/[A-Z]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Password must include an uppercase letter",
      });
    }
    if (!/\d/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Password must include a number",
      });
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Password must include a symbol",
      });
    }
  });

export const loginSchema = z.object({
  identifier: z
    .string({ required_error: "Email or username is required" })
    .trim()
    .min(1, "Email or username is required"),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
  remember: z.boolean().optional(),
});

export const requestOtpSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Enter a valid email"),
});

export const verifyOtpSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Enter a valid email"),
  otp: z
    .string({ required_error: "OTP is required" })
    .trim()
    .regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const resetPasswordSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Enter a valid email"),
  resetToken: z
    .string({ required_error: "Reset token is required" })
    .trim()
    .min(20, "Reset token is invalid"),
  newPassword: strongPasswordSchema,
});
