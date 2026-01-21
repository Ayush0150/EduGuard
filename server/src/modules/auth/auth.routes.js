import { Router } from "express";

import { requireAuth } from "../../core/middlewares/auth.js";
import {
  authRateLimiter,
  loginRateLimiter,
} from "../../core/middlewares/rateLimit.js";
import { validateBody } from "../../core/middlewares/validate.js";

import {
  getMe,
  postLogin,
  postLogout,

  postAdminLogin,
  postAdminRequestOtp,
  postAdminVerifyOtp,
  postAdminResetPassword,

  postRequestOtp,
  postVerifyOtp,
  postResetPassword,
} from "./auth.controller.js";

import {
  loginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  resetPasswordSchema,
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

authRouter.post(
  "/logout",
  postLogout
);

/* =====================================================
   Admin Authentication
===================================================== */

authRouter.post(
  "/admin/login",
  loginRateLimiter,
  validateBody(loginSchema),
  postAdminLogin
);

/* =====================================================
   Admin Password Recovery (Strict)
===================================================== */

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

/* =====================================================
   User Password Recovery
===================================================== */

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

/* =====================================================
   Protected Routes
===================================================== */

authRouter.get(
  "/me",
  requireAuth,
  getMe
);
