import crypto from "crypto";
import nodemailer from "nodemailer";
import { env } from "../../core/config/env.js";
import { signAccessToken } from "../../core/security/jwt.js";
import { hashPassword, verifyPassword } from "../../core/security/password.js";
import { loginAttemptStore } from "../../core/store/loginAttemptStore.js";
import { User } from "../users/user.model.js";

function normalizeIdentifier(identifier) {
  return String(identifier ?? "").trim();
}

function isEmail(value) {
  return String(value).includes("@");
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function createTransporter() {
  const { host, port, secure, user, pass } = env.mail;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function getOfficialFrom() {
  // Always send from the authenticated SMTP mailbox to avoid Gmail spoofing/rewrites.
  if (env.mail.user) return `EduGuard Security <${env.mail.user}>`;
  return env.mail.from;
}

function buildResetOtpEmail({ otp }) {
  const safeOtp = String(otp ?? "").replace(/[^0-9]/g, "");
  const subject = "EduGuard password reset code";

  const text = `Your EduGuard password reset code is: ${safeOtp}\n\nThis code expires in 10 minutes. If you didn’t request this, you can ignore this email.`;

  const html = `
  <div style="background:#f8fafc;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;padding:20px">
      <div style="font-size:14px;font-weight:700;letter-spacing:.3px;">EduGuard</div>
      <h2 style="margin:14px 0 6px 0;font-size:18px;">Password reset</h2>
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.45;color:#334155">Use this one-time code to reset your password. It expires in <b>10 minutes</b>.</p>
      <div style="margin:16px 0;padding:14px;border:1px dashed #cbd5e1;background:#f1f5f9;text-align:center">
        <div style="font-size:22px;font-weight:800;letter-spacing:6px;color:#0f172a">${safeOtp}</div>
      </div>
      <p style="margin:14px 0 0 0;font-size:12px;line-height:1.45;color:#64748b">If you didn’t request a password reset, you can safely ignore this email.</p>
    </div>
  </div>`;

  return { subject, text, html };
}

export async function login({ identifier, password, ip }) {
  const normalized = normalizeIdentifier(identifier);
  const attemptKey = loginAttemptStore.key({ identifier: normalized, ip });

  const query = isEmail(normalized)
    ? { email: normalized.toLowerCase() }
    : { username: normalized };

  const user = await User.findOne(query);
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : false;

  if (!user || !user.isActive || !passwordOk) {
    loginAttemptStore.increment(attemptKey);
    return {
      ok: false,
      status: 401,
      message:
        "Unable to sign in. Please check your credentials and try again.",
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

export async function requestPasswordResetOtp({ email }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  // Prevent user enumeration: always return success.
  if (!user || !user.isActive) return { ok: true };

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = sha256(otp);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  user.resetOtpHash = otpHash;
  user.resetOtpExpiresAt = expiresAt;
  user.resetTokenHash = null;
  user.resetTokenExpiresAt = null;
  await user.save();

  const transporter = createTransporter();
  if (!transporter) {
    // eslint-disable-next-line no-console
    console.warn("SMTP not configured; OTP (dev only):", otp);
    return { ok: true };
  }

  const mail = buildResetOtpEmail({ otp });
  try {
    await transporter.sendMail({
      from: getOfficialFrom(),
      to: normalizedEmail,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to send OTP email:", err?.message ?? err);

    // In development, surface a clear error so it can be fixed quickly.
    if (env.nodeEnv !== "production") {
      return {
        ok: false,
        status: 500,
        message:
          "OTP email could not be sent. Check SMTP_* settings in server/.env",
      };
    }

    // In production, avoid leaking whether an email exists.
    return { ok: true };
  }

  return { ok: true };
}

export async function verifyPasswordResetOtp({ email, otp }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.isActive)
    return {
      ok: false,
      status: 400,
      message: "The code you entered is invalid.",
    };

  if (!user.resetOtpHash || !user.resetOtpExpiresAt) {
    return {
      ok: false,
      status: 400,
      message: "No one-time code has been requested for this email.",
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

  return { ok: true, resetToken };
}

export async function resetPassword({ email, resetToken, newPassword }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.isActive)
    return {
      ok: false,
      status: 400,
      message: "Invalid password reset request.",
    };

  if (!user.resetTokenHash || !user.resetTokenExpiresAt) {
    return {
      ok: false,
      status: 400,
      message: "Reset session not found. Please request a new one-time code.",
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

  return { ok: true };
}
