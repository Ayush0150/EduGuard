import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Global error handler - production-safe with detailed logging
 */
export function errorHandler(err, req, res, next) {
  const status = Number(err?.statusCode ?? 500);
  const message = err?.message ?? "Internal Server Error";

  if (status >= 500) {
    // Log the error with context
    logger.error(message, {
      stack: err.stack,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userId: req.user?.id,
    });
  }

  // Production: don't leak internal errors
  if (env.isProduction && status === 500) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }

  res.status(status).json({
    success: false,
    message,
    ...(env.isDevelopment && { stack: err.stack }),
  });
}
