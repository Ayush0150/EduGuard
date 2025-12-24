import { asyncHandler } from "../../core/utils/asyncHandler.js";
import {
  login,
  requestPasswordResetOtp,
  resetPassword,
  verifyPasswordResetOtp,
} from "./auth.service.js";

export const postLogin = asyncHandler(async (req, res) => {
  const ip = req.ip;
  const result = await login({ ...req.body, ip });
  if (!result.ok) {
    return res.status(result.status).json({
      success: false,
      message: result.message,
    });
  }

  res.json({ success: true, data: result.data });
});

export const postRequestOtp = asyncHandler(async (req, res) => {
  const result = await requestPasswordResetOtp(req.body);
  if (result && result.ok === false) {
    return res.status(result.status ?? 500).json({
      success: false,
      message: result.message ?? "Failed to send OTP",
    });
  }

  return res.json({
    success: true,
    message:
      "If an account exists for this email, a one-time code has been sent.",
  });
});

export const postVerifyOtp = asyncHandler(async (req, res) => {
  const result = await verifyPasswordResetOtp(req.body);
  if (!result.ok) {
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }
  res.json({ success: true, data: { resetToken: result.resetToken } });
});

export const postResetPassword = asyncHandler(async (req, res) => {
  const result = await resetPassword(req.body);
  if (!result.ok) {
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }
  res.json({ success: true, message: "Password updated successfully" });
});
