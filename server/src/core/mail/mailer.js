import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * =====================================================
 * EduGuard Mail Service
 * =====================================================
 *
 * Features:
 * - Lazy transporter initialization
 * - Connection pooling
 * - SMTP verification caching
 * - Gmail auto-detection
 * - Structured logging
 * - Safe error propagation
 *
 * Supports:
 * - Gmail
 * - Outlook
 * - Zoho
 * - Custom SMTP servers
 */

let cachedTransporter = null;
let transporterVerified = false;

/* -----------------------------------------------------
   Normalizers
----------------------------------------------------- */

function normalizeHost(host) {
  return String(host ?? "").trim().toLowerCase();
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function isGmailAccount({ host, user }) {
  const h = normalizeHost(host);
  const u = normalizeEmail(user);

  return (
    h === "smtp.gmail.com" ||
    u.endsWith("@gmail.com") ||
    u.endsWith("@googlemail.com")
  );
}

/* -----------------------------------------------------
   Transporter Factory
----------------------------------------------------- */

function createTransporterOrThrow() {
  const { host, port, secure, user, pass, from } = env.mail;

  if (!user || !pass) {
    const err = new Error(
      "SMTP not configured. Set SMTP_USER and SMTP_PASS."
    );
    err.code = "SMTP_NOT_CONFIGURED";
    throw err;
  }

  const normalizedHost = normalizeHost(host);

  /* Gmail auto configuration */
  if (!normalizedHost && isGmailAccount({ host, user })) {
    logger.info("Mailer: Using Gmail service");

    return nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  if (!normalizedHost) {
    const err = new Error("SMTP_HOST is missing.");
    err.code = "SMTP_NOT_CONFIGURED";
    throw err;
  }

  logger.info("Mailer: Using SMTP server", {
    host: normalizedHost,
    port,
    secure,
  });

  return nodemailer.createTransport({
    host: normalizedHost,
    port,
    secure,
    auth: { user, pass },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

/* -----------------------------------------------------
   Transporter Cache
----------------------------------------------------- */

async function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = createTransporterOrThrow();
    transporterVerified = false;
  }

  if (!transporterVerified) {
    await cachedTransporter.verify();
    transporterVerified = true;

    logger.info("Mailer: SMTP connection verified");
  }

  return cachedTransporter;
}

/* -----------------------------------------------------
   Public Mail API
----------------------------------------------------- */

export async function sendMail({ to, subject, text, html }) {
  const transporter = await getTransporter();

  try {
    const info = await transporter.sendMail({
      from: env.mail.from,
      to,
      subject,
      text,
      html,
    });

    logger.info("Email dispatched", {
      category: "mailer",
      to,
      messageId: info.messageId,
    });

    return {
      sent: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error("Email delivery failed", {
      category: "mailer",
      to,
      code: error.code,
      message: error.message,
      command: error.command,
    });

    throw error;
  }
}
