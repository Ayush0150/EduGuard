import { Router } from "express";
import {
  postLogin,
  postRequestOtp,
  postResetPassword,
  postVerifyOtp,
} from "./auth.controller.js";
import {
  loginSchema,
  requestOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "./auth.validation.js";

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

export const authRouter = Router();

authRouter.post("/login", validate(loginSchema), postLogin);

authRouter.post(
  "/forgot-password/request-otp",
  validate(requestOtpSchema),
  postRequestOtp
);
authRouter.post(
  "/forgot-password/verify-otp",
  validate(verifyOtpSchema),
  postVerifyOtp
);
authRouter.post(
  "/forgot-password/reset",
  validate(resetPasswordSchema),
  postResetPassword
);
