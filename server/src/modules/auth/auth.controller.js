import { env } from "../../core/config/env.js";
import { asyncHandler } from "../../core/utils/asyncHandler.js";
import {
  getCurrentUser,
  loginAdmin,
  loginUser,
  requestPasswordResetOtp,
  resetPassword,
  verifyPasswordResetOtp,
} from "./auth.service.js";

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

/**
 * POST /api/auth/login
 */
export const postLogin = asyncHandler(async (req, res) => {
  const ip = req.ip;

  const result = await loginUser({ ...req.body, ip });

  if (!result?.ok) {
    return res.status(result?.status || 401).json({
      success: false,
      message: result?.message || "Invalid credentials",
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
  const ip = req.ip;
  const result = await loginAdmin({ ...req.body, ip });

  if (!result?.ok) {
    return res.status(result?.status || 401).json({
      success: false,
      message: result?.message || "Invalid credentials",
    });
  }

  return res.status(200).json({
    success: true,
    data: result.data,
  });
});

/**
 * POST /api/v1/auth/logout
 */
export const postLogout = asyncHandler(async (req, res) => {
  // Stateless JWT logout: client clears token.
  return res.status(200).json({ success: true });
});

/**
 * GET /api/v1/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  const result = await getCurrentUser({ userId: req.user.id });

  if (!result?.ok) {
    return res.status(result?.status || 401).json({
      success: false,
      message: result?.message || "Unauthorized",
    });
  }

  return res.status(200).json({
    success: true,
    data: result.data,
  });
});

/**
 * POST /api/auth/forgot-password/request-otp
 */
export const postRequestOtp = asyncHandler(async (req, res) => {
  const result = await requestPasswordResetOtp(req.body);

  if (result && result.ok === false) {
    return res.status(result.status || 500).json({
      success: false,
      message: result.message || "Failed to send OTP",
    });
  }

  // Prevent account enumeration
  return res.status(200).json({
    success: true,
    message:
      "If an account exists for this email, a one-time code has been sent.",
  });
});

/**
 * POST /api/v1/auth/admin/forgot-password/request-otp
 */
export const postAdminRequestOtp = asyncHandler(async (req, res) => {
  if (!env.superAdminEmail) {
    return res.status(500).json({
      success: false,
      message: "Admin email is not configured (SUPER_ADMIN_EMAIL).",
    });
  }

  const email = normalizeEmail(req.body?.email);
  if (email !== env.superAdminEmail) {
    return res.status(403).json({
      success: false,
      message: "Admin password reset is restricted.",
    });
  }

  const result = await requestPasswordResetOtp({ email });

  if (result && result.ok === false) {
    return res.status(result.status || 500).json({
      success: false,
      message: result.message || "Failed to send OTP",
    });
  }

  return res.status(200).json({
    success: true,
    message: "A one-time code has been sent.",
  });
});

/**
 * POST /api/v1/auth/admin/forgot-password/verify-otp
 */
export const postAdminVerifyOtp = asyncHandler(async (req, res) => {
  if (!env.superAdminEmail) {
    return res.status(500).json({
      success: false,
      message: "Admin email is not configured (SUPER_ADMIN_EMAIL).",
    });
  }

  const email = normalizeEmail(req.body?.email);
  if (email !== env.superAdminEmail) {
    return res.status(403).json({
      success: false,
      message: "Admin password reset is restricted.",
    });
  }

  const result = await verifyPasswordResetOtp({
    email,
    otp: req.body?.otp,
  });

  if (!result?.ok) {
    return res.status(result?.status || 400).json({
      success: false,
      message: result?.message || "Invalid or expired OTP",
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
  if (!env.superAdminEmail) {
    return res.status(500).json({
      success: false,
      message: "Admin email is not configured (SUPER_ADMIN_EMAIL).",
    });
  }

  const email = normalizeEmail(req.body?.email);
  if (email !== env.superAdminEmail) {
    return res.status(403).json({
      success: false,
      message: "Admin password reset is restricted.",
    });
  }

  const result = await resetPassword({
    email,
    resetToken: req.body?.resetToken,
    newPassword: req.body?.newPassword,
  });

  if (!result?.ok) {
    return res.status(result?.status || 400).json({
      success: false,
      message: result?.message || "Password reset failed",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});

/**
 * POST /api/auth/forgot-password/verify-otp
 */
export const postVerifyOtp = asyncHandler(async (req, res) => {
  const result = await verifyPasswordResetOtp(req.body);

  if (!result?.ok) {
    return res.status(result?.status || 400).json({
      success: false,
      message: result?.message || "Invalid or expired OTP",
    });
  }

  return res.status(200).json({
    success: true,
    data: { resetToken: result.resetToken },
  });
});

/**
 * POST /api/auth/forgot-password/reset
 */
export const postResetPassword = asyncHandler(async (req, res) => {
  const result = await resetPassword(req.body);

  if (!result?.ok) {
    return res.status(result?.status || 400).json({
      success: false,
      message: result?.message || "Password reset failed",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Password updated successfully",
  });
});
