import { z } from "zod";

const strongPasswordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .superRefine((val, ctx) => {
    const password = String(val ?? "");
    if (!/[a-z]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must include a lowercase letter",
      });
    }
    if (!/[A-Z]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must include an uppercase letter",
      });
    }
    if (!/\d/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must include a number",
      });
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password must include a symbol",
      });
    }
  });

export const createUserSchema = z.object({
  username: z
    .string({ required_error: "Username is required" })
    .trim()
    .min(3, "Username must be at least 3 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Enter a valid email"),
  password: strongPasswordSchema,
  role: z
    .enum(["ADMIN", "SECURITY", "MAINTENANCE", "PRINCIPAL", "SUPER_ADMIN"])
    .optional()
    .default("ADMIN"),
  isActive: z.boolean().optional().default(true),
});
