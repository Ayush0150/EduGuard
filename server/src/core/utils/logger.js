import { env } from "../config/env.js";

/**
 * =====================================================
 * EduGuard Structured Logger
 * =====================================================
 *
 * ✔ Production-safe
 * ✔ Cloud-log compatible
 * ✔ Security audit friendly
 * ✔ Zero dependency
 */

/* -----------------------------------------------------
   Log Levels
----------------------------------------------------- */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const CURRENT_LEVEL =
  LOG_LEVELS[String(process.env.LOG_LEVEL || "").toUpperCase()] ??
  (env.isProduction ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG);

/* -----------------------------------------------------
   Utilities
----------------------------------------------------- */

function safeMeta(meta) {
  return meta && typeof meta === "object" ? meta : {};
}

/* -----------------------------------------------------
   Formatter
----------------------------------------------------- */

function format(level, message, meta = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...safeMeta(meta),
  };

  if (env.isProduction) {
    return JSON.stringify(payload);
  }

  const extra =
    Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : "";

  return `[${payload.timestamp}] ${level}: ${message}${extra}`;
}

/* -----------------------------------------------------
   Writer
----------------------------------------------------- */

function write(level, message, meta = {}) {
  const numericLevel = LOG_LEVELS[level];
  if (numericLevel > CURRENT_LEVEL) return;

  const output = format(level, message, meta);

  if (level === "ERROR" || level === "WARN") {
    process.stderr.write(`${output}\n`);
  } else {
    process.stdout.write(`${output}\n`);
  }

  return output;
}

/* -----------------------------------------------------
   Public Logger
----------------------------------------------------- */

export const logger = {
  error: (message, meta) => write("ERROR", message, meta),
  warn: (message, meta) => write("WARN", message, meta),
  info: (message, meta) => write("INFO", message, meta),
  debug: (message, meta) => write("DEBUG", message, meta),

  /* ============================
     SECURITY AUDIT LOGS
  ============================ */

  security: {
    loginAttempt(success, { email, ip, reason } = {}) {
      write("INFO", success ? "Login successful" : "Login failed", {
        category: "security",
        event: "login_attempt",
        success,
        email,
        ip,
        reason,
      });
    },

    loginLocked({ email, ip, attempts } = {}) {
      write("WARN", "Account locked due to excessive login attempts", {
        category: "security",
        event: "login_locked",
        email,
        ip,
        attempts,
      });
    },

    passwordReset({ email, success, step, ...extra } = {}) {
      write("INFO", `Password reset: ${step}`, {
        category: "security",
        event: "password_reset",
        email,
        success,
        step,
        ...extra,
      });
    },

    unauthorizedAccess({ ip, path, userId, reason } = {}) {
      write("WARN", "Unauthorized access attempt", {
        category: "security",
        event: "unauthorized_access",
        ip,
        path,
        userId,
        reason,
      });
    },

    adminAction({ adminId, action, targetUserId, success } = {}) {
      write("INFO", `Admin action: ${action}`, {
        category: "security",
        event: "admin_action",
        adminId,
        action,
        targetUserId,
        success,
      });
    },
  },

  /* ============================
     PERFORMANCE LOGS
  ============================ */

  perf: {
    dbQuery(operation, duration, collection) {
      write("DEBUG", "Database query executed", {
        category: "performance",
        operation,
        duration,
        collection,
      });
    },

    apiRequest(method, path, duration, status) {
      write("DEBUG", "API request completed", {
        category: "performance",
        method,
        path,
        duration,
        status,
      });
    },
  },
};
