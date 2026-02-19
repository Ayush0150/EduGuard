import { Router } from "express";

import { requireAuth } from "../../core/middlewares/auth.js";
import {
  authRateLimiter,
  loginRateLimiter,
  otpRateLimiter,
  passwordResetRateLimiter,
} from "../../core/middlewares/rateLimit.js";
import { validateBody } from "../../core/middlewares/validate.js";

import {
  getMe,
  postAdminLogin,
  postAdminRequestOtp,
  postAdminResendLoginOtp,
  postAdminResetPassword,
  postAdminVerifyLoginOtp,
  postAdminVerifyOtp,
  postLogin,
  postLogout,
  postRequestOtp,
  postResetPassword,
  postVerifyOtp,
} from "./auth.controller.js";

import {
  adminLoginVerifyOtpSchema,
  loginSchema,
  requestOtpSchema,
  resendAdminOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from "./auth.validation.js";

/**
 * =====================================================
 * Authentication Routes
 * =====================================================
 *
 * Base path: /api/v1/auth
 *
 * Route groups:
 * - Public authentication
 * - Admin authentication
 * - Password recovery
 * - Protected identity
 */

export const authRouter = Router();

/* =====================================================
   Global auth protection (rate limiting)
===================================================== */

authRouter.use(authRateLimiter);

/* =====================================================
   Public Authentication
===================================================== */

authRouter.post(
  "/login",
  loginRateLimiter,
  validateBody(loginSchema),
  postLogin
);

authRouter.post("/logout", postLogout);

/* =====================================================
   Admin Authentication
===================================================== */

authRouter.post(
  "/admin/login",
  loginRateLimiter,
  validateBody(loginSchema),
  postAdminLogin
);

authRouter.post(
  "/admin/login/verify-otp",
  loginRateLimiter,
  otpRateLimiter,
  validateBody(adminLoginVerifyOtpSchema),
  postAdminVerifyLoginOtp
);

authRouter.post(
  "/admin/login/resend-otp",
  loginRateLimiter,
  otpRateLimiter,
  validateBody(resendAdminOtpSchema),
  postAdminResendLoginOtp
);

/* =====================================================
   Admin Password Recovery (Strict)
===================================================== */

authRouter.post(
  "/admin/forgot-password/request-otp",
  passwordResetRateLimiter,
  otpRateLimiter,
  validateBody(requestOtpSchema),
  postAdminRequestOtp
);

authRouter.post(
  "/admin/forgot-password/verify-otp",
  otpRateLimiter,
  validateBody(verifyOtpSchema),
  postAdminVerifyOtp
);

authRouter.post(
  "/admin/forgot-password/reset",
  passwordResetRateLimiter,
  validateBody(resetPasswordSchema),
  postAdminResetPassword
);

/* =====================================================
   User Password Recovery
===================================================== */

authRouter.post(
  "/forgot-password/request-otp",
  passwordResetRateLimiter,
  otpRateLimiter,
  validateBody(requestOtpSchema),
  postRequestOtp
);

authRouter.post(
  "/forgot-password/verify-otp",
  otpRateLimiter,
  validateBody(verifyOtpSchema),
  postVerifyOtp
);

authRouter.post(
  "/forgot-password/reset",
  passwordResetRateLimiter,
  validateBody(resetPasswordSchema),
  postResetPassword
);

/* =====================================================
   Protected Routes
===================================================== */

authRouter.get("/me", requireAuth, getMe);
