import crypto from "crypto";
import nodemailer from "nodemailer";
import { env } from "../../core/config/env.js";
import { signAccessToken } from "../../core/security/jwt.js";
import { hashPassword, verifyPassword } from "../../core/security/password.js";
import { loginAttemptStore } from "../../core/store/loginAttemptStore.js";
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

/* -------------------------------------------------------------------------- */
/*                              Email Helpers                                  */
/* -------------------------------------------------------------------------- */

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
  // Always use authenticated mailbox to avoid spam / spoofing issues
  return env.mail.user
    ? `EduGuard Security <${env.mail.user}>`
    : env.mail.from;
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
      message: "Unable to sign in. Please check your credentials and try again.",
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

  const transporter = createTransporter();
  if (!transporter) {
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
    console.error("Failed to send OTP email:", err?.message ?? err);

    if (env.nodeEnv !== "production") {
      return {
        ok: false,
        status: 500,
        message:
          "OTP email could not be sent. Check SMTP_* settings in server/.env",
      };
    }
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
    return { ok: false, status: 400, message: "The code you entered is invalid." };
  }

  if (user.resetOtpExpiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      status: 400,
      message: "That one-time code has expired. Please request a new code.",
    };
  }

  if (sha256(otp) !== user.resetOtpHash) {
    return { ok: false, status: 400, message: "The code you entered is invalid." };
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetTokenHash = sha256(resetToken);
  user.resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  user.resetOtpHash = null;
  user.resetOtpExpiresAt = null;
  await user.save();

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
    return { ok: false, status: 400, message: "Invalid password reset request." };
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
