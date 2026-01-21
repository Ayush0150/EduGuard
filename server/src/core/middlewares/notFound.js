import { logger } from "../utils/logger.js";

/**
 * 404 Not Found Middleware
 *
 * Handles all undefined routes.
 * Must be registered AFTER all routes.
 */
export function notFound(req, res) {
  logger.warn("Route not found", {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  });

  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
}
