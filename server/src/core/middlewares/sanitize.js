/**
 * Server-side input sanitization middleware
 * Prevents XSS and injection attacks
 */

/**
 * Sanitize string input
 */
function sanitizeString(value) {
  if (typeof value !== "string") return value;

  return value
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets to prevent XSS
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .substring(0, 10000); // Limit length to prevent DoS
}

/**
 * Deep sanitize object
 */
function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }

  if (typeof obj === "object") {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key as well
      const cleanKey = sanitizeString(key);
      sanitized[cleanKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  if (typeof obj === "string") {
    return sanitizeString(obj);
  }

  return obj;
}

/**
 * Middleware to sanitize request body, query, and params
 */
export function sanitizeInput(req, res, next) {
  // Sanitize body (can be reassigned)
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query (need to modify in place for Express 5)
  if (req.query && typeof req.query === "object") {
    const sanitized = sanitizeObject(req.query);
    Object.keys(req.query).forEach((key) => delete req.query[key]);
    Object.assign(req.query, sanitized);
  }

  // Sanitize params (need to modify in place for Express 5)
  if (req.params && typeof req.params === "object") {
    const sanitized = sanitizeObject(req.params);
    Object.keys(req.params).forEach((key) => delete req.params[key]);
    Object.assign(req.params, sanitized);
  }

  next();
}

/**
 * Normalize email to lowercase and trim
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== "string") return email;
  return email.trim().toLowerCase();
}

/**
 * Validate and sanitize MongoDB ObjectId
 */
export function sanitizeObjectId(id) {
  if (!id || typeof id !== "string") return null;

  const sanitized = id.trim();

  // MongoDB ObjectId is exactly 24 hex characters
  if (!/^[0-9a-fA-F]{24}$/.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Remove sensitive fields from user object before sending to client
 */
export function sanitizeUserOutput(user) {
  if (!user) return null;

  const sanitized = { ...user };

  // Remove sensitive fields
  delete sanitized.passwordHash;
  delete sanitized.resetOtpHash;
  delete sanitized.resetOtpExpiresAt;
  delete sanitized.resetTokenHash;
  delete sanitized.resetTokenExpiresAt;
  delete sanitized.__v;

  return sanitized;
}

/**
 * Limit string length to prevent DoS
 */
export function limitLength(value, maxLength = 1000) {
  if (typeof value !== "string") return value;
  return value.substring(0, maxLength);
}
