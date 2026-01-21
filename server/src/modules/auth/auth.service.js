import crypto from "crypto";

import { env } from "../../core/config/env.js";
import { sendMail } from "../../core/mail/mailer.js";
import { signAccessToken } from "../../core/security/jwt.js";
import { hashPassword, verifyPassword } from "../../core/security/password.js";
import { loginAttemptStore } from "../../core/store/loginAttemptStore.js";
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
const RESET_TOKEN_EXPIRY_MINUTES = 15;

const LOGIN_LOCK_MESSAGE =
  "Too many failed sign-in attempts. Please try again after 15 minutes.";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

/* =====================================================
   Helpers
===================================================== */

function normalize(value) {
  return String(value ?? "").trim();
}

function isEmail(value) {
  return value.includes("@");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function isAdminRole(role) {
  return ADMIN_ROLES.has(role);
}

function maskEmail(email) {
  const val = normalize(email);
  const at = val.indexOf("@");
  if (at <= 2) return "***";
  return `${val.slice(0, 2)}***${val.slice(at)}`;
}

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

/* =====================================================
   Core Login Engine
===================================================== */

async function executeLogin({
  identifier,
  password,
  ip,
  roleGuard,
  roleErrorMessage,
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
  });

  if (!result.ok) return result;

  if (env.superAdminEmail) {
    const email = result.data.user.email.toLowerCase();
    if (email !== env.superAdminEmail) {
      return { ok: false, status: 403, message: "Admin access restricted." };
    }
  }

  return result;
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

export async function requestPasswordResetOtp({ email }) {
  const normalizedEmail = normalize(email).toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.isActive) {
    return {
      ok: false,
      status: 404,
      message: "No active account found for this email.",
    };
  }

  const otp = String(crypto.randomInt(100000, 1000000));

  user.resetOtpHash = sha256(otp);
  user.resetOtpExpiresAt = new Date(
    Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000
  );

  user.resetTokenHash = null;
  user.resetTokenExpiresAt = null;

  await user.save();

  const mail = buildResetOtpEmail({ otp });

  await sendMail({
    to: normalizedEmail,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });

  logger.security.passwordReset({
    email: maskEmail(normalizedEmail),
    step: "OTP_SENT",
  });

  return { ok: true };
}

export async function verifyPasswordResetOtp({ email, otp }) {
  const normalizedEmail = normalize(email).toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (
    !user ||
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

export async function resetPassword({ email, resetToken, newPassword }) {
  const normalizedEmail = normalize(email).toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (
    !user ||
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
    email: maskEmail(normalizedEmail),
    step: "PASSWORD_CHANGED",
  });

  return { ok: true };
}
