import crypto from "crypto";

import { env } from "../../core/config/env.js";
import { sendMail } from "../../core/mail/mailer.js";
import { signAccessToken } from "../../core/security/jwt.js";
import { hashPassword, verifyPassword } from "../../core/security/password.js";
import { loginAttemptStore } from "../../core/store/loginAttemptStore.js";
import {
  generateOtp,
  isAdminRole,
  isEmail,
  isGmailAddress,
  maskEmail,
  normalize,
  sha256,
} from "../../core/utils/helpers.js";
import { logger } from "../../core/utils/logger.js";
import { User } from "../users/user.model.js";

/**
 * =====================================================
 * Authentication Service
 * =====================================================
 *
 * Responsibilities:
 * - User & Admin authentication
 * - Login throttling & brute-force protection
 * - OTP-based password recovery
 * - Secure reset-token workflow
 *
 * ⚠️ No HTTP logic here.
 * Controllers handle request/response.
 */

/* =====================================================
   Constants
===================================================== */

const MAX_LOGIN_ATTEMPTS = 10;
const OTP_EXPIRY_MINUTES = 10;
const ADMIN_LOGIN_OTP_EXPIRY_MINUTES = 5;
const RESET_TOKEN_EXPIRY_MINUTES = 15;

const LOGIN_LOCK_MESSAGE =
  "Too many failed sign-in attempts. Please try again after 15 minutes.";

/* =====================================================
   Email Template
===================================================== */

function buildResetOtpEmail({ otp }) {
  const safeOtp = String(otp).replace(/[^0-9]/g, "");

  return {
    subject: "EduGuard | Password Reset Verification Code",

    text: `EduGuard Password Reset

Your verification code is: ${safeOtp}

This code expires in ${OTP_EXPIRY_MINUTES} minutes.
If you did not request a password reset, please ignore this email.

— EduGuard Security Team`,

    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px">
    <tr>
      <td align="center">
        <table style="max-width:520px;background:#fff;border:1px solid #e2e8f0">
          <tr>
            <td style="padding:16px;font-weight:700;border-bottom:1px solid #e2e8f0">
              EduGuard Security
            </td>
          </tr>

          <tr>
            <td style="padding:20px">
              <p>Use the verification code below to reset your password:</p>

              <div style="margin:20px 0;padding:14px;text-align:center;
                border:1px dashed #cbd5e1;background:#f1f5f9;
                font-size:22px;font-weight:700;letter-spacing:6px;">
                ${safeOtp}
              </div>

              <p style="font-size:13px;color:#475569">
                This code expires in ${OTP_EXPIRY_MINUTES} minutes.
              </p>

              <p style="font-size:12px;color:#64748b">
                If you did not request this reset, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:12px;border-top:1px solid #e2e8f0;
              font-size:11px;color:#94a3b8;text-align:center">
              © ${new Date().getFullYear()} EduGuard
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
  };
}

function buildAdminLoginOtpEmail({ otp }) {
  const safeOtp = String(otp).replace(/[^0-9]/g, "");

  return {
    subject: "EduGuard | Admin Login Verification Code",

    text: `EduGuard Admin Login

Your verification code is: ${safeOtp}

This code expires in ${ADMIN_LOGIN_OTP_EXPIRY_MINUTES} minutes.
If you did not try to sign in, please secure your account.

— EduGuard Security Team`,

    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px">
    <tr>
      <td align="center">
        <table style="max-width:520px;background:#fff;border:1px solid #e2e8f0">
          <tr>
            <td style="padding:16px;font-weight:700;border-bottom:1px solid #e2e8f0">
              EduGuard Security
            </td>
          </tr>

          <tr>
            <td style="padding:20px">
              <p>Use the verification code below to complete your admin login:</p>

              <div style="margin:20px 0;padding:14px;text-align:center;
                border:1px dashed #cbd5e1;background:#f1f5f9;
                font-size:22px;font-weight:700;letter-spacing:6px;">
                ${safeOtp}
              </div>

              <p style="font-size:13px;color:#475569">
                This code expires in ${ADMIN_LOGIN_OTP_EXPIRY_MINUTES} minutes.
              </p>

              <p style="font-size:12px;color:#64748b">
                If you did not initiate this login, please reset your password immediately.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:12px;border-top:1px solid #e2e8f0;
              font-size:11px;color:#94a3b8;text-align:center">
              © ${new Date().getFullYear()} EduGuard
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,
  };
}

/* =====================================================
   Core Login Engine
===================================================== */

async function executeLogin({
  identifier,
  password,
  ip,
  roleGuard,
  roleErrorMessage,
  issueToken = true,
}) {
  const normalized = normalize(identifier);
  const attemptKey = loginAttemptStore.key({ identifier: normalized, ip });

  const attempts = loginAttemptStore.getAttempts(attemptKey);
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    logger.security.loginLocked({ identifier: normalized, ip, attempts });
    return { ok: false, status: 429, message: LOGIN_LOCK_MESSAGE };
  }

  const query = isEmail(normalized)
    ? { email: normalized.toLowerCase() }
    : { username: normalized };

  const user = await User.findOne(query).select("+passwordHash");

  const passwordValid =
    user && (await verifyPassword(password, user.passwordHash));

  if (!user || !user.isActive || !passwordValid) {
    loginAttemptStore.increment(attemptKey);

    logger.security.loginAttempt(false, {
      identifier: normalized,
      ip,
      reason: !user
        ? "USER_NOT_FOUND"
        : !user.isActive
          ? "ACCOUNT_DISABLED"
          : "INVALID_PASSWORD",
    });

    return {
      ok: false,
      status: 401,
      message: "Invalid credentials.",
    };
  }

  if (roleGuard && !roleGuard(user.role)) {
    return {
      ok: false,
      status: 403,
      message: roleErrorMessage || "Access denied.",
    };
  }

  loginAttemptStore.reset(attemptKey);

  if (!issueToken) {
    return {
      ok: true,
      status: 200,
      user,
    };
  }

  const token = signAccessToken(
    { userId: user._id.toString(), role: user.role },
    { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn }
  );

  return {
    ok: true,
    status: 200,
    data: {
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
    },
  };
}

/* =====================================================
   Public APIs
===================================================== */

export function loginUser(payload) {
  return executeLogin({
    ...payload,
    roleGuard: (role) => !isAdminRole(role),
    roleErrorMessage: "Please use the Admin Login page.",
  });
}

export async function loginAdmin(payload) {
  const result = await executeLogin({
    ...payload,
    roleGuard: isAdminRole,
    roleErrorMessage: "Admin access required.",
    issueToken: false,
  });

  if (!result.ok) return result;

  const user = await User.findById(result.user._id).select([
    "+adminLoginOtpHash",
    "+adminLoginOtpExpiresAt",
    "email",
    "role",
    "username",
    "isActive",
  ]);

  if (!user || !isAdminRole(user.role)) {
    return { ok: false, status: 403, message: "Admin access required." };
  }

  if (env.superAdminEmail) {
    const email = user.email.toLowerCase();
    if (email !== env.superAdminEmail) {
      return { ok: false, status: 403, message: "Admin access restricted." };
    }
  }

  if (!isGmailAddress(user.email)) {
    return {
      ok: false,
      status: 400,
      message: "Admin email must be a Gmail address.",
    };
  }

  const otp = generateOtp();
  user.adminLoginOtpHash = sha256(otp);
  user.adminLoginOtpExpiresAt = new Date(
    Date.now() + ADMIN_LOGIN_OTP_EXPIRY_MINUTES * 60 * 1000
  );
  await user.save();

  if (env.isDevelopment) {
    logger.debug("Admin OTP generated", {
      category: "security",
      event: "admin_login_otp_generated",
      email: maskEmail(user.email),
      otp,
      otpHashPrefix: user.adminLoginOtpHash?.slice(0, 8),
      expiresAt: user.adminLoginOtpExpiresAt?.toISOString?.(),
      adminId: user._id?.toString?.(),
    });
  }

  const mail = buildAdminLoginOtpEmail({ otp });

  try {
    logger.info("Admin OTP dispatch started", {
      category: "security",
      event: "admin_login_otp_send",
      email: maskEmail(user.email),
      ip: payload?.ip,
      adminId: user._id?.toString?.(),
    });

    await sendMail({
      to: user.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    logger.info("Admin OTP dispatched", {
      category: "security",
      event: "admin_login_otp_sent",
      email: maskEmail(user.email),
      ip: payload?.ip,
      adminId: user._id?.toString?.(),
    });
  } catch (error) {
    user.adminLoginOtpHash = null;
    user.adminLoginOtpExpiresAt = null;
    await user.save();

    logger.error("Admin OTP dispatch failed", {
      category: "security",
      event: "admin_login_otp_failed",
      email: maskEmail(user.email),
      ip: payload?.ip,
      code: error?.code,
      message: error?.message,
      adminId: user._id?.toString?.(),
    });

    const err = new Error(
      "Failed to deliver OTP email. Please check SMTP settings and Gmail App Password."
    );
    err.status = 502;
    err.code = "SMTP_SEND_FAILED";
    throw err;
  }

  logger.security.loginAttempt(true, {
    email: maskEmail(user.email),
    ip: payload?.ip,
    reason: "ADMIN_OTP_SENT",
    adminId: user._id?.toString?.(),
  });

  return {
    ok: true,
    status: 200,
    data: {
      otpRequired: true,
      emailMasked: maskEmail(user.email),
      expiresAt: user.adminLoginOtpExpiresAt,
      adminId: user._id?.toString?.(),
    },
  };
}

export async function verifyAdminLoginOtp({ adminId, otp }) {
  if (!adminId) {
    return {
      ok: false,
      status: 400,
      message: "Missing adminId for OTP verification.",
    };
  }

  const normalizedOtp = String(otp ?? "").trim();
  if (!/^\d{6}$/.test(normalizedOtp)) {
    return { ok: false, status: 400, message: "Invalid OTP." };
  }

  const user = await User.findById(adminId).select([
    "+adminLoginOtpHash",
    "+adminLoginOtpExpiresAt",
    "isActive",
    "role",
    "email",
    "username",
  ]);

  if (!user || !user.isActive || !isAdminRole(user.role)) {
    logger.warn("Admin OTP verification denied", {
      category: "security",
      event: "admin_login_otp_denied",
      adminId,
    });
    return { ok: false, status: 403, message: "Admin access required." };
  }

  if (env.superAdminEmail) {
    const email = user.email.toLowerCase();
    if (email !== env.superAdminEmail) {
      return { ok: false, status: 403, message: "Admin access restricted." };
    }
  }

  if (
    !user.adminLoginOtpHash ||
    !user.adminLoginOtpExpiresAt ||
    user.adminLoginOtpExpiresAt < new Date()
  ) {
    logger.warn("Admin OTP expired or missing", {
      category: "security",
      event: "admin_login_otp_expired",
      email: user?.email ? maskEmail(user.email) : undefined,
      hasHash: Boolean(user?.adminLoginOtpHash),
      expiresAt: user?.adminLoginOtpExpiresAt?.toISOString?.(),
      adminId,
    });
    user.adminLoginOtpHash = null;
    user.adminLoginOtpExpiresAt = null;
    await user.save();
    return { ok: false, status: 400, message: "Invalid or expired OTP." };
  }

  const incomingHash = sha256(normalizedOtp);

  if (env.isDevelopment) {
    logger.debug("Admin OTP verification attempt", {
      category: "security",
      event: "admin_login_otp_verify_attempt",
      email: maskEmail(user.email),
      otp: normalizedOtp,
      otpHashPrefix: incomingHash.slice(0, 8),
      storedHashPrefix: user.adminLoginOtpHash?.slice(0, 8),
      expiresAt: user.adminLoginOtpExpiresAt?.toISOString?.(),
      now: new Date().toISOString(),
      adminId,
    });
  }

  if (incomingHash !== user.adminLoginOtpHash) {
    logger.warn("Admin OTP invalid", {
      category: "security",
      event: "admin_login_otp_invalid",
      email: maskEmail(user.email),
      adminId,
    });
    return { ok: false, status: 400, message: "Invalid OTP." };
  }

  user.adminLoginOtpHash = null;
  user.adminLoginOtpExpiresAt = null;
  await user.save();

  logger.info("Admin OTP verified", {
    category: "security",
    event: "admin_login_otp_verified",
    email: maskEmail(user.email),
    adminId,
  });

  const token = signAccessToken(
    { userId: user._id.toString(), role: user.role },
    { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn }
  );

  return {
    ok: true,
    status: 200,
    data: {
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
    },
  };
}

/* =====================================================
   Resend Admin Login OTP
===================================================== */

export async function resendAdminLoginOtp({ adminId, ip }) {
  if (!adminId) {
    return {
      ok: false,
      status: 400,
      message: "Missing admin identifier.",
    };
  }

  const user = await User.findById(adminId).select([
    "+adminLoginOtpHash",
    "+adminLoginOtpExpiresAt",
    "email",
    "role",
    "username",
    "isActive",
  ]);

  // Validate user exists, is active, and is admin
  if (!user || !user.isActive) {
    logger.warn("Resend OTP denied - user not found or inactive", {
      category: "security",
      event: "admin_resend_otp_denied",
      adminId,
      ip,
    });
    return {
      ok: false,
      status: 403,
      message: "Unable to resend verification code.",
    };
  }

  if (!isAdminRole(user.role)) {
    logger.warn("Resend OTP denied - not admin", {
      category: "security",
      event: "admin_resend_otp_denied",
      adminId,
      ip,
      role: user.role,
    });
    return {
      ok: false,
      status: 403,
      message: "Admin access required.",
    };
  }

  // Check super admin restriction
  if (env.superAdminEmail) {
    const email = user.email.toLowerCase();
    if (email !== env.superAdminEmail) {
      return {
        ok: false,
        status: 403,
        message: "Admin access restricted.",
      };
    }
  }

  // Validate Gmail requirement
  if (!isGmailAddress(user.email)) {
    return {
      ok: false,
      status: 400,
      message: "Admin email must be a Gmail address.",
    };
  }

  // Invalidate previous OTP and generate new one
  const otp = generateOtp();
  user.adminLoginOtpHash = sha256(otp);
  user.adminLoginOtpExpiresAt = new Date(
    Date.now() + ADMIN_LOGIN_OTP_EXPIRY_MINUTES * 60 * 1000
  );
  await user.save();

  if (env.isDevelopment) {
    logger.debug("Admin OTP regenerated", {
      category: "security",
      event: "admin_login_otp_resent",
      email: maskEmail(user.email),
      otp,
      otpHashPrefix: user.adminLoginOtpHash?.slice(0, 8),
      expiresAt: user.adminLoginOtpExpiresAt?.toISOString?.(),
      adminId: user._id?.toString?.(),
      ip,
    });
  }

  // Send OTP email
  const mail = buildAdminLoginOtpEmail({ otp });

  try {
    logger.info("Admin resend OTP dispatch started", {
      category: "security",
      event: "admin_resend_otp_send",
      email: maskEmail(user.email),
      ip,
      adminId: user._id?.toString?.(),
    });

    await sendMail({
      to: user.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    logger.info("Admin resend OTP dispatched", {
      category: "security",
      event: "admin_resend_otp_sent",
      email: maskEmail(user.email),
      ip,
      adminId: user._id?.toString?.(),
    });
  } catch (error) {
    // Clear OTP on email failure
    user.adminLoginOtpHash = null;
    user.adminLoginOtpExpiresAt = null;
    await user.save();

    logger.error("Admin resend OTP dispatch failed", {
      category: "security",
      event: "admin_resend_otp_failed",
      email: maskEmail(user.email),
      ip,
      code: error?.code,
      message: error?.message,
      adminId: user._id?.toString?.(),
    });

    return {
      ok: false,
      status: 502,
      message: "Failed to send verification code. Please try again.",
    };
  }

  return {
    ok: true,
    status: 200,
    data: {
      message: "New verification code has been sent to your registered email.",
      emailMasked: maskEmail(user.email),
      expiresAt: user.adminLoginOtpExpiresAt,
    },
  };
}

export async function getCurrentUser({ userId }) {
  const user = await User.findById(userId)
    .select("username email role isActive")
    .lean();

  if (!user || !user.isActive) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }

  return {
    ok: true,
    data: {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    },
  };
}

/* =====================================================
   Password Reset Flow
===================================================== */

export async function requestPasswordResetOtp({ identifier, email }) {
  // identifier: username or email (fallback to legacy email param)
  const normalized = normalize(identifier ?? email);
  if (!normalized) {
    return { ok: true };
  }

  const query = normalized.includes("@")
    ? { email: normalized.toLowerCase() }
    : { username: normalized };

  // Always select email for sending OTP, but never reveal if user exists
  const user = await User.findOne(query).select([
    "email",
    "isActive",
    "+resetOtpExpiresAt",
  ]);

  // Prevent OTP abuse: if OTP is still valid, do not send another
  if (user && user.resetOtpExpiresAt && user.resetOtpExpiresAt > new Date()) {
    // Silently succeed to avoid enumeration
    return { ok: true };
  }

  // Only send OTP if user exists and is active
  if (user && user.isActive) {
    const otp = generateOtp();
    user.resetOtpHash = sha256(otp);
    user.resetOtpExpiresAt = new Date(
      Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
    );
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    await user.save();
    const mail = buildResetOtpEmail({ otp });
    await sendMail({
      to: user.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    logger.security.passwordReset({
      email: maskEmail(user.email),
      step: "OTP_SENT",
    });
  }
  // Always return success, never reveal if user exists
  return { ok: true };
}

export async function verifyPasswordResetOtp({ identifier, email, otp }) {
  const normalizedIdentifier = normalize(identifier ?? email);
  if (!normalizedIdentifier) {
    return { ok: false, status: 400, message: "Invalid or expired OTP." };
  }
  const query = normalizedIdentifier.includes("@")
    ? { email: normalizedIdentifier.toLowerCase() }
    : { username: normalizedIdentifier };

  const user = await User.findOne(query).select([
    "+resetOtpHash",
    "+resetOtpExpiresAt",
    "isActive",
  ]);

  if (
    !user ||
    !user.isActive ||
    !user.resetOtpHash ||
    !user.resetOtpExpiresAt ||
    user.resetOtpExpiresAt < new Date()
  ) {
    return { ok: false, status: 400, message: "Invalid or expired OTP." };
  }

  if (sha256(otp) !== user.resetOtpHash) {
    return { ok: false, status: 400, message: "Invalid OTP." };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");

  user.resetTokenHash = sha256(resetToken);
  user.resetTokenExpiresAt = new Date(
    Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
  );

  user.resetOtpHash = null;
  user.resetOtpExpiresAt = null;

  await user.save();

  return { ok: true, resetToken };
}

export async function resetPassword({
  identifier,
  email,
  resetToken,
  newPassword,
}) {
  const normalizedIdentifier = normalize(identifier ?? email);
  if (!normalizedIdentifier) {
    return { ok: false, status: 400, message: "Invalid reset session." };
  }
  const query = normalizedIdentifier.includes("@")
    ? { email: normalizedIdentifier.toLowerCase() }
    : { username: normalizedIdentifier };

  const user = await User.findOne(query).select([
    "+resetTokenHash",
    "+resetTokenExpiresAt",
    "isActive",
    "email",
  ]);

  if (
    !user ||
    !user.isActive ||
    !user.resetTokenHash ||
    !user.resetTokenExpiresAt ||
    user.resetTokenExpiresAt < new Date()
  ) {
    return { ok: false, status: 400, message: "Invalid reset session." };
  }

  if (sha256(resetToken) !== user.resetTokenHash) {
    return { ok: false, status: 400, message: "Invalid reset token." };
  }

  user.passwordHash = await hashPassword(newPassword);
  user.resetTokenHash = null;
  user.resetTokenExpiresAt = null;

  await user.save();

  logger.security.passwordReset({
    email: maskEmail(user.email),
    step: "PASSWORD_CHANGED",
  });

  return { ok: true };
}

/* =====================================================
   Verify Current Password
===================================================== */

/**
 * Verify the authenticated user's current password.
 * Used as a gate before destructive / critical actions.
 */
export async function verifyCurrentPassword({ userId, password }) {
  const user = await User.findById(userId).select("+passwordHash");

  if (!user || !user.isActive) {
    return { ok: false, status: 401, message: "User not found or inactive." };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    return { ok: false, status: 401, message: "Incorrect password." };
  }

  return { ok: true };
}
