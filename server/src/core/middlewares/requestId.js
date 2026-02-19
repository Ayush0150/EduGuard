/**
 * =====================================================
 * Request ID Tracking Middleware
 * =====================================================
 *
 * Adds unique request IDs for:
 * - Debugging and log correlation
 * - Error tracking across services
 * - Client error reporting
 */

import crypto from "crypto";

/**
 * Generate a unique request ID
 */
function generateRequestId() {
  return `req_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

/**
 * Middleware to add request ID tracking
 */
export function requestIdMiddleware(req, res, next) {
  // Check for existing request ID from client or load balancer
  const existingId =
    req.headers["x-request-id"] || req.headers["x-correlation-id"];

  // Use existing ID or generate new one
  const requestId = existingId || generateRequestId();

  // Attach to request object
  req.requestId = requestId;

  // Add to response headers
  res.setHeader("X-Request-ID", requestId);

  next();
}

export default requestIdMiddleware;
