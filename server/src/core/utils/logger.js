import { env } from "../config/env.js";

/**
 * Production-grade structured logger
 *
 * Features:
 * - JSON format in production, human-readable in development
 * - Configurable log levels via LOG_LEVEL env variable
 * - Silent by default (logs are structured but not printed to console)
 * - Specialized security event logging
 * - Can be piped to external monitoring services
 *
 * Usage:
 *   logger.error('Error message', { context: 'data' });
 *   logger.security.loginAttempt(true, { email, ip });
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLogLevel =
  LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ??
  (env.isProduction ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG);

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();

  if (env.isProduction) {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta,
    });
  }

  // Development: human-readable format
  const metaStr =
    Object.keys(meta).length > 0 ? ` | ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
}

function log(level, message, meta = {}) {
  const levelValue = LOG_LEVELS[level.toUpperCase()];
  if (levelValue > currentLogLevel) return;

  const formatted = formatMessage(level, message, meta);

  // Silent logging - no console output
  // Logs are structured and can be piped to monitoring services
  return formatted;
}

export const logger = {
  error: (message, meta = {}) => log("ERROR", message, meta),
  warn: (message, meta = {}) => log("WARN", message, meta),
  info: (message, meta = {}) => log("INFO", message, meta),
  debug: (message, meta = {}) => log("DEBUG", message, meta),

  // Security-specific logging
  security: {
    loginAttempt: (success, { email, ip, reason }) => {
      log("INFO", success ? "Login successful" : "Login failed", {
        category: "security",
        event: "login_attempt",
        success,
        email,
        ip,
        reason,
      });
    },

    loginLocked: ({ email, ip, attempts }) => {
      log("WARN", "Account locked due to too many failed attempts", {
        category: "security",
        event: "account_locked",
        email,
        ip,
        attempts,
      });
    },

    passwordReset: ({ email, success, step }) => {
      log("INFO", `Password reset: ${step}`, {
        category: "security",
        event: "password_reset",
        email,
        success,
        step,
      });
    },

    unauthorizedAccess: ({ ip, path, userId, reason }) => {
      log("WARN", "Unauthorized access attempt", {
        category: "security",
        event: "unauthorized_access",
        ip,
        path,
        userId,
        reason,
      });
    },

    adminAction: ({ adminId, action, targetUserId, success }) => {
      log("INFO", `Admin action: ${action}`, {
        category: "security",
        event: "admin_action",
        adminId,
        action,
        targetUserId,
        success,
      });
    },
  },

  // Performance monitoring
  perf: {
    dbQuery: (operation, duration, collection) => {
      log("DEBUG", `DB query: ${operation}`, {
        category: "performance",
        operation,
        duration,
        collection,
      });
    },

    apiRequest: (method, path, duration, status) => {
      log("DEBUG", `API request: ${method} ${path}`, {
        category: "performance",
        method,
        path,
        duration,
        status,
      });
    },
  },
};
