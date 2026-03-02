import { env } from "../../core/config/env.js";
import { asyncHandler } from "../../core/utils/asyncHandler.js";
import { normalizeEmail } from "../../core/utils/helpers.js";

import {
  getCurrentUser,
  loginAdmin,
  loginUser,
  requestPasswordResetOtp,
  resetPassword,
  verifyAdminLoginOtp,
  verifyCurrentPassword,
  verifyPasswordResetOtp,
} from "./auth.service.js";

/**
 * =====================================================
 * Authentication Controller
 * =====================================================
 *
 * Responsibilities:
 * - HTTP request handling
 * - Input normalization
 * - Response formatting
 *
 * Business logic lives in auth.service.js
 */

/* =====================================================
   Helpers
===================================================== */

function isSmtpConfigured() {
  return Boolean(env.mail?.user) && Boolean(env.mail?.pass);
}

/* =====================================================
   Authentication
===================================================== */

/**
 * POST /api/v1/auth/login
 */
/**
 * POST /api/v1/auth/verify-password
 * Verify the current (authenticated) user's password.
 * Used before destructive / critical actions on the client.
 */
export const postVerifyPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Password is required",
    });
  }

  const result = await verifyCurrentPassword({
    userId: req.user.id,
    password,
  });

  if (!result.ok) {
    return res.status(result.status ?? 401).json({
      success: false,
      message: result.message ?? "Invalid password",
    });
  }

  return res.status(200).json({ success: true, message: "Password verified" });
});

/**
 * POST /api/v1/auth/login
 */
export const postLogin = asyncHandler(async (req, res) => {
  const result = await loginUser({
    ...req.body,
    ip: req.ip,
  });

  if (!result?.ok) {
    return res.status(result.status ?? 401).json({
      success: false,
      message: result.message ?? "Invalid credentials",
    });
  }

  return res.status(200).json({
    success: true,
    data: result.data,
  });
});

/**
 * POST /api/v1/auth/admin/login
 */
export const postAdminLogin = asyncHandler(async (req, res) => {
  if (!isSmtpConfigured()) {
    return res.status(500).json({
      success: false,
      message: "Email service is not configured.",
    });
  }

  const result = await loginAdmin({
    ...req.body,
    ip: req.ip,
  });

  if (!result?.ok) {
    return res.status(result.status ?? 401).json({
      success: false,
      message: result.message ?? "Invalid credentials",
    });
  }

  return res.status(200).json({
    success: true,
    data: result.data,
  });
});

/**
 * POST /api/v1/auth/admin/login/verify-otp
 */
export const postAdminVerifyLoginOtp = asyncHandler(async (req, res) => {
  const result = await verifyAdminLoginOtp({
    adminId: req.body?.adminId,
    otp: req.body?.otp,
  });

  if (!result?.ok) {
    return res.status(result.status ?? 400).json({
      success: false,
      message: result.message ?? "Invalid or expired OTP",
    });
  }

  return res.status(200).json({
    success: true,
    data: result.data,
  });
});

/**
 * POST /api/v1/auth/admin/login/resend-otp
 *
 * Resend OTP for admin login.
 * Rate limited to prevent abuse.
 */
export const postAdminResendLoginOtp = asyncHandler(async (req, res) => {
  if (!isSmtpConfigured()) {
    return res.status(500).json({
      success: false,
      message: "Email service is not configured.",
    });
  }

  const result = await resendAdminLoginOtp({
    adminId: req.body?.adminId,
    ip: req.ip,
  });

  if (!result?.ok) {
    return res.status(result.status ?? 400).json({
      success: false,
      message: result.message ?? "Failed to resend verification code",
    });
  }

  return res.status(200).json({
    success: true,
    message: result.data?.message,
    data: {
      emailMasked: result.data?.emailMasked,
      expiresAt: result.data?.expiresAt,
    },
  });
});

/**
 * POST /api/v1/auth/logout
 *
 * Stateless JWT logout.
 * Client clears stored token.
 */
export const postLogout = asyncHandler(async (_req, res) => {
  return res.status(200).json({ success: true });
});

/**
 * GET /api/v1/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const result = await getCurrentUser({ userId: req.user.id });

  if (!result?.ok) {
    return res.status(result.status ?? 401).json({
      success: false,
      message: result.message ?? "Unauthorized",
    });
  }

  return res.status(200).json({
    success: true,
    data: result.data,
  });
});

/* =====================================================
   User Password Recovery
===================================================== */

/**
 * POST /api/v1/auth/forgot-password/request-otp
 */
export const postRequestOtp = asyncHandler(async (req, res) => {
  if (!isSmtpConfigured()) {
    return res.status(500).json({
      success: false,
      message:
        "Email service is not configured. Please set SMTP_USER and SMTP_PASS.",
    });
  }

  // Accepts { identifier: username or email } (legacy email supported)
  const result = await requestPasswordResetOtp({
    identifier: req.body?.identifier ?? req.body?.email,
  });

  if (!result?.ok) {
    return res.status(result.status ?? 500).json({
      success: false,
      message: result.message ?? "Failed to send OTP",
    });
  }

  return res.status(200).json({
    success: true,
    message: "A one-time verification code has been sent to your email.",
  });
});

/**
 * POST /api/v1/auth/forgot-password/verify-otp
 */
export const postVerifyOtp = asyncHandler(async (req, res) => {
  const result = await verifyPasswordResetOtp({
    identifier: req.body?.identifier ?? req.body?.email,
    otp: req.body?.otp,
  });

  if (!result?.ok) {
    return res.status(result.status ?? 400).json({
      success: false,
      message: result.message ?? "Invalid or expired OTP",
    });
  }

  return res.status(200).json({
    success: true,
    data: { resetToken: result.resetToken },
  });
});

/**
 * POST /api/v1/auth/forgot-password/reset
 */
export const postResetPassword = asyncHandler(async (req, res) => {
  const result = await resetPassword({
    identifier: req.body?.identifier ?? req.body?.email,
    resetToken: req.body?.resetToken,
    newPassword: req.body?.newPassword,
  });

  if (!result?.ok) {
    return res.status(result.status ?? 400).json({
      success: false,
      message: result.message ?? "Password reset failed",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Password updated successfully.",
  });
});

/* =====================================================
   Admin Password Recovery (Restricted)
===================================================== */

/**
 * POST /api/v1/auth/admin/forgot-password/request-otp
 */
export const postAdminRequestOtp = asyncHandler(async (req, res) => {
  if (!env.superAdminEmail) {
    return res.status(500).json({
      success: false,
      message: "SUPER_ADMIN_EMAIL is not configured.",
    });
  }

  if (!isSmtpConfigured()) {
    return res.status(500).json({
      success: false,
      message: "Email service is not configured.",
    });
  }

  const identifier = req.body?.identifier ?? req.body?.email;
  const email = normalizeEmail(identifier);

  if (!email || email !== env.superAdminEmail) {
    return res.status(403).json({
      success: false,
      message: "Admin password reset is restricted.",
    });
  }

  const result = await requestPasswordResetOtp({ identifier: email });

  if (!result?.ok) {
    return res.status(result.status ?? 500).json({
      success: false,
      message: result.message ?? "Failed to send OTP",
    });
  }

  return res.status(200).json({
    success: true,
    message: "One-time verification code sent.",
  });
});

/**
 * POST /api/v1/auth/admin/forgot-password/verify-otp
 */
export const postAdminVerifyOtp = asyncHandler(async (req, res) => {
  const identifier = req.body?.identifier ?? req.body?.email;
  const email = normalizeEmail(identifier);

  if (!email || email !== env.superAdminEmail) {
    return res.status(403).json({
      success: false,
      message: "Admin password reset is restricted.",
    });
  }

  const result = await verifyPasswordResetOtp({
    identifier: email,
    otp: req.body?.otp,
  });

  if (!result?.ok) {
    return res.status(result.status ?? 400).json({
      success: false,
      message: result.message ?? "Invalid or expired OTP",
    });
  }

  return res.status(200).json({
    success: true,
    data: { resetToken: result.resetToken },
  });
});

/**
 * POST /api/v1/auth/admin/forgot-password/reset
 */
export const postAdminResetPassword = asyncHandler(async (req, res) => {
  const identifier = req.body?.identifier ?? req.body?.email;
  const email = normalizeEmail(identifier);

  if (!email || email !== env.superAdminEmail) {
    return res.status(403).json({
      success: false,
      message: "Admin password reset is restricted.",
    });
  }

  const result = await resetPassword({
    identifier: email,
    resetToken: req.body?.resetToken,
    newPassword: req.body?.newPassword,
  });

  if (!result?.ok) {
    return res.status(result.status ?? 400).json({
      success: false,
      message: result.message ?? "Password reset failed",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Password updated successfully.",
  });
});
