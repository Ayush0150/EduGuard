import crypto from "crypto";
import nodemailer from "nodemailer";
import { env } from "../../core/config/env.js";
import { signAccessToken } from "../../core/security/jwt.js";
import { hashPassword, verifyPassword } from "../../core/security/password.js";
import { loginAttemptStore } from "../../core/store/loginAttemptStore.js";
import { logger } from "../../core/utils/logger.js";
import { User } from "../users/user.model.js";

/* -------------------------------------------------------------------------- */
/*                                Utilities                                   */
/* -------------------------------------------------------------------------- */

function normalizeIdentifier(identifier) {
  return String(identifier ?? "").trim();
}

function isEmail(value) {
  return String(value).includes("@");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_LOCK_MESSAGE =
  "Too many failed sign-in attempts. Please try again in 15 minutes.";

const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

function isAdminRole(role) {
  return ADMIN_ROLES.has(role);
}

/* -------------------------------------------------------------------------- */
/*                              Email Helpers                                  */
/* -------------------------------------------------------------------------- */

function createTransporter() {
  const { host, port, secure, user, pass } = env.mail;
  if (!user || !pass) return null;

  const normalizedUser = String(user).trim().toLowerCase();
  const normalizedHost = String(host ?? "")
    .trim()
    .toLowerCase();
  const isGmailUser =
    normalizedUser.endsWith("@gmail.com") ||
    normalizedUser.endsWith("@googlemail.com");

  // If host is explicitly configured, honor host/port/secure.
  if (normalizedHost) {
    return nodemailer.createTransport({
      host: normalizedHost,
      port,
      secure,
      auth: { user, pass },
    });
  }

  // Otherwise, fall back to Nodemailer's well-known Gmail config for Gmail accounts.
  if (isGmailUser) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }

  return null;
}

function createSmtpTransporter({ host, port, secure, user, pass }) {
  const normalizedHost = String(host ?? "")
    .trim()
    .toLowerCase();
  if (!normalizedHost || !user || !pass) return null;

  return nodemailer.createTransport({
    host: normalizedHost,
    port,
    secure,
    auth: { user, pass },
  });
}

function getOfficialFrom() {
  // Always use authenticated mailbox to avoid spam / spoofing issues
  return env.mail.user ? `EduGuard Security <${env.mail.user}>` : env.mail.from;
}

/* -------------------------------------------------------------------------- */
/*                      Professional Password Reset Email                      */
/* -------------------------------------------------------------------------- */

function buildResetOtpEmail({ otp }) {
  const safeOtp = String(otp ?? "").replace(/[^0-9]/g, "");
  const subject = "EduGuard | Password Reset Verification Code";

  const text = `EduGuard Password Reset

Your verification code is: ${safeOtp}

This code expires in 10 minutes.
If you did not request a password reset, please ignore this email.

— EduGuard Security Team`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Password Reset</title>
</head>

<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0"
          style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0">

          <!-- Header -->
          <tr>
            <td style="padding:18px 20px;border-bottom:1px solid #e2e8f0">
              <div style="font-size:14px;font-weight:700;letter-spacing:.4px">
                EduGuard Security
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:20px">
              <h2 style="margin:0 0 10px;font-size:18px;font-weight:600">
                Password reset request
              </h2>

              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155">
                We received a request to reset your EduGuard account password.
                Please use the verification code below to continue.
              </p>

              <!-- OTP -->
              <div style="margin:20px 0;padding:14px;text-align:center;
                border:1px dashed #cbd5e1;background:#f1f5f9;">
                <div style="font-size:22px;font-weight:700;letter-spacing:6px;">
                  ${safeOtp}
                </div>
              </div>

              <p style="margin:0 0 12px;font-size:13px;color:#475569">
                This code will expire in <b>10 minutes</b>.
              </p>

              <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b">
                If you did not request this reset, you can safely ignore this
                email. Your account will remain secure.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:14px;border-top:1px solid #e2e8f0;
              font-size:11px;color:#94a3b8;text-align:center">
              © ${new Date().getFullYear()} EduGuard • Secure College Monitoring
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;

  return { subject, text, html };
}

/* -------------------------------------------------------------------------- */
/*                                   Login                                    */
/* -------------------------------------------------------------------------- */

export async function login({
  identifier,
  password,
  ip,
  roleCheck,
  roleCheckMessage,
}) {
  const normalized = normalizeIdentifier(identifier);
  const attemptKey = loginAttemptStore.key({ identifier: normalized, ip });

  const attempts = loginAttemptStore.getAttempts(attemptKey);
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    logger.security.loginLocked({
      email: normalized,
      ip,
      attempts,
    });
    return {
      ok: false,
      status: 429,
      message: LOGIN_LOCK_MESSAGE,
    };
  }

  const query = isEmail(normalized)
    ? { email: normalized.toLowerCase() }
    : { username: normalized };

  const user = await User.findOne(query).select("+passwordHash");
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : false;

  if (!user || !user.isActive || !passwordOk) {
    loginAttemptStore.increment(attemptKey);
    logger.security.loginAttempt(false, {
      email: normalized,
      ip,
      reason: !user
        ? "User not found"
        : !user.isActive
        ? "Account inactive"
        : "Invalid password",
    });
    return {
      ok: false,
      status: 401,
      message:
        "Unable to sign in. Please check your credentials and try again.",
    };
  }

  if (typeof roleCheck === "function" && !roleCheck(user.role)) {
    logger.security.loginAttempt(false, {
      email: user.email,
      ip,
      reason: roleCheckMessage || "Insufficient role",
    });
    return {
      ok: false,
      status: 403,
      message: roleCheckMessage || "Forbidden",
    };
  }

  loginAttemptStore.reset(attemptKey);

  logger.security.loginAttempt(true, {
    email: user.email,
    ip,
    reason: "Success",
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

export async function loginUser({ identifier, password, ip }) {
  return login({
    identifier,
    password,
    ip,
    roleCheck: (role) => !isAdminRole(role),
    roleCheckMessage: "Please sign in via the Admin Login page.",
  });
}

export async function loginAdmin({ identifier, password, ip }) {
  const result = await login({
    identifier,
    password,
    ip,
    roleCheck: (role) => isAdminRole(role),
    roleCheckMessage: "Admin access required.",
  });

  if (!result?.ok) return result;

  if (env.superAdminEmail) {
    const email = String(result?.data?.user?.email ?? "")
      .trim()
      .toLowerCase();
    if (email !== env.superAdminEmail) {
      return {
        ok: false,
        status: 403,
        message: "Admin access restricted.",
      };
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

/* -------------------------------------------------------------------------- */
/*                         Request Password Reset OTP                          */
/* -------------------------------------------------------------------------- */

export async function requestPasswordResetOtp({ email }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  // Prevent user enumeration
  if (!user || !user.isActive) return { ok: true };

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  user.resetOtpHash = sha256(otp);
  user.resetOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  user.resetTokenHash = null;
  user.resetTokenExpiresAt = null;
  await user.save();

  logger.security.passwordReset({
    email: normalizedEmail,
    success: true,
    step: "OTP_requested",
  });

  const isAdminTarget =
    env.superAdminEmail && normalizedEmail === env.superAdminEmail;
  const otpRecipient =
    isAdminTarget && env.adminRecoveryEmail
      ? env.adminRecoveryEmail
      : normalizedEmail;

  const transporter = createTransporter();
  if (!transporter) {
    const isAdminEmail =
      (env.superAdminEmail && normalizedEmail === env.superAdminEmail) ||
      (env.mail.user &&
        normalizedEmail === String(env.mail.user).trim().toLowerCase());

    if (env.nodeEnv === "production" || isAdminEmail) {
      return {
        ok: false,
        status: 500,
        message:
          "Email service is not configured. Set SMTP_* variables in server/.env",
      };
    }

    console.warn("SMTP not configured; OTP (dev only):", otp);
    return { ok: true };
  }

  const mail = buildResetOtpEmail({ otp });

  try {
    const send = async (tx) => {
      await tx.verify();
      await tx.sendMail({
        from: getOfficialFrom(),
        to: otpRecipient,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
    };

    try {
      // Primary attempt
      await send(transporter);
    } catch (primaryErr) {
      // Gmail fallback between 587 (STARTTLS) and 465 (SSL)
      const host = String(env.mail.host ?? "")
        .trim()
        .toLowerCase();
      const isGmail = host === "smtp.gmail.com";

      if (!isGmail) throw primaryErr;

      const fallbackCandidates = [
        { port: 587, secure: false },
        { port: 465, secure: true },
      ].filter(
        (c) => !(c.port === env.mail.port && c.secure === env.mail.secure)
      );

      let lastErr = primaryErr;
      let sent = false;

      for (const candidate of fallbackCandidates) {
        const tx = createSmtpTransporter({
          host,
          port: candidate.port,
          secure: candidate.secure,
          user: env.mail.user,
          pass: env.mail.pass,
        });

        if (!tx) continue;

        try {
          await send(tx);
          sent = true;
          break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!sent) throw lastErr;
    }
  } catch (err) {
    console.error("Failed to send OTP email:", err?.message ?? err);

    const extra =
      env.nodeEnv !== "production" && err?.message ? ` (${err.message})` : "";

    return {
      ok: false,
      status: 500,
      message:
        "OTP email could not be sent. Check SMTP_* settings in server/.env" +
        extra,
    };
  }

  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/*                        Verify Password Reset OTP                            */
/* -------------------------------------------------------------------------- */

export async function verifyPasswordResetOtp({ email, otp }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (
    !user ||
    !user.isActive ||
    !user.resetOtpHash ||
    !user.resetOtpExpiresAt
  ) {
    return {
      ok: false,
      status: 400,
      message: "The code you entered is invalid.",
    };
  }

  if (user.resetOtpExpiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      status: 400,
      message: "That one-time code has expired. Please request a new code.",
    };
  }

  if (sha256(otp) !== user.resetOtpHash) {
    return {
      ok: false,
      status: 400,
      message: "The code you entered is invalid.",
    };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetTokenHash = sha256(resetToken);
  user.resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  user.resetOtpHash = null;
  user.resetOtpExpiresAt = null;
  await user.save();

  logger.security.passwordReset({
    email: normalizedEmail,
    success: true,
    step: "OTP_verified",
  });

  return { ok: true, resetToken };
}

/* -------------------------------------------------------------------------- */
/*                             Reset Password                                  */
/* -------------------------------------------------------------------------- */

export async function resetPassword({ email, resetToken, newPassword }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (
    !user ||
    !user.isActive ||
    !user.resetTokenHash ||
    !user.resetTokenExpiresAt
  ) {
    return {
      ok: false,
      status: 400,
      message: "Invalid password reset request.",
    };
  }

  if (user.resetTokenExpiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      status: 400,
      message: "Reset session expired. Please request a new one-time code.",
    };
  }

  if (sha256(resetToken) !== user.resetTokenHash) {
    return {
      ok: false,
      status: 400,
      message: "Invalid reset session. Please request a new one-time code.",
    };
  }

  user.passwordHash = await hashPassword(newPassword);
  user.resetTokenHash = null;
  user.resetTokenExpiresAt = null;
  await user.save();

  logger.security.passwordReset({
    email: normalizedEmail,
    success: true,
    step: "Password_reset_completed",
  });

  return { ok: true };
}
