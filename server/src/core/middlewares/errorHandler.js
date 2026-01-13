import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Global error handler middleware
 * - Logs errors with context in all environments
 * - Returns sanitized error messages in production
 * - Includes stack traces only in development
 *
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Next middleware
 */
export function errorHandler(err, req, res, next) {
  const status = Number(err?.statusCode ?? 500);
  const message = err?.message ?? "Internal Server Error";

  // Log server errors with full context
  if (status >= 500) {
    logger.error(message, {
      stack: err.stack,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userId: req.user?.id,
    });
  }

  // Security: Don't expose internal errors in production
  if (env.isProduction && status === 500) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }

  // Development: Include stack trace for debugging
  res.status(status).json({
    success: false,
    message,
    ...(env.isDevelopment && { stack: err.stack }),
  });
}
