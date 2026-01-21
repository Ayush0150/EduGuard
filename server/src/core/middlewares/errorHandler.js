import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * =====================================================
 * Global Error Handler
 * =====================================================
 *
 * Responsibilities:
 * - Centralized error handling
 * - Safe responses in production
 * - Detailed debugging in development
 * - Structured logging for monitoring systems
 *
 * MUST be registered last in Express middleware chain.
 */
export function errorHandler(err, req, res, next) {
  const statusCode = Number(err?.statusCode || err?.status || 500);

  const isOperational = statusCode < 500;

  const safeMessage =
    statusCode === 500
      ? "Internal server error"
      : err?.message || "Request failed";

  /* ---------------------------------------------------
     Structured Logging
  --------------------------------------------------- */

  if (!isOperational) {
    // System / server failure
    logger.error("System error", {
      category: "api",
      statusCode,
      message: err?.message,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id,
      stack: env.isDevelopment ? err.stack : undefined,
    });
  } else {
    // Client / validation / auth error
    logger.warn("Operational error", {
      category: "api",
      statusCode,
      message: err?.message,
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id,
    });
  }

  /* ---------------------------------------------------
     Production-safe response
  --------------------------------------------------- */

  if (env.isProduction && statusCode === 500) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }

  /* ---------------------------------------------------
     Development / non-critical response
  --------------------------------------------------- */

  return res.status(statusCode).json({
    success: false,
    message: safeMessage,
    ...(env.isDevelopment && {
      error: err.name,
      stack: err.stack,
    }),
  });
}
