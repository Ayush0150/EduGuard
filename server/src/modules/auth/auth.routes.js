import { Router } from "express";
import { requireAuth } from "../../core/middlewares/auth.js";
import {
  authRateLimiter,
  loginRateLimiter,
} from "../../core/middlewares/rateLimit.js";
import { validateBody } from "../../core/middlewares/validate.js";
import {
  getMe,
  postAdminLogin,
  postAdminRequestOtp,
  postAdminResetPassword,
  postAdminVerifyOtp,
  postLogin,
  postLogout,
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

export const authRouter = Router();

/**
 * AUTH ROUTES
 * Base path: /api/v1/auth
 */

authRouter.use(authRateLimiter);

authRouter.post(
  "/login",
  loginRateLimiter,
  validateBody(loginSchema),
  postLogin
);
authRouter.post(
  "/admin/login",
  loginRateLimiter,
  validateBody(loginSchema),
  postAdminLogin
);

// Admin-only password reset flow (strict)
authRouter.post(
  "/admin/forgot-password/request-otp",
  validateBody(requestOtpSchema),
  postAdminRequestOtp
);

authRouter.post(
  "/admin/forgot-password/verify-otp",
  validateBody(verifyOtpSchema),
  postAdminVerifyOtp
);

authRouter.post(
  "/admin/forgot-password/reset",
  validateBody(resetPasswordSchema),
  postAdminResetPassword
);

authRouter.post("/logout", postLogout);

authRouter.get("/me", requireAuth, getMe);

authRouter.post(
  "/forgot-password/request-otp",
  validateBody(requestOtpSchema),
  postRequestOtp
);

authRouter.post(
  "/forgot-password/verify-otp",
  validateBody(verifyOtpSchema),
  postVerifyOtp
);

authRouter.post(
  "/forgot-password/reset",
  validateBody(resetPasswordSchema),
  postResetPassword
);
