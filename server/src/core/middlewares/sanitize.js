/**
 * =====================================================
 * Server-side Input Sanitization Middleware
 * =====================================================
 *
 * Purpose:
 * - Prevent XSS attacks
 * - Prevent injection payloads
 * - Limit input size (DoS protection)
 *
 * IMPORTANT:
 * - Does NOT validate input (Zod does that)
 * - Does NOT escape HTML (API is not a renderer)
 * - Sanitizes values ONLY (never keys)
 */

/* -----------------------------------------------------
   Constants
----------------------------------------------------- */

const MAX_STRING_LENGTH = 1000;

/* -----------------------------------------------------
   String Sanitization
----------------------------------------------------- */

function sanitizeString(value) {
  if (typeof value !== "string") return value;

  return value
    .trim()
    .replace(/[<>]/g, "") // prevent HTML tags
    .replace(/javascript:/gi, "") // protocol injection
    .slice(0, MAX_STRING_LENGTH);
}

/* -----------------------------------------------------
   Recursive Sanitizer
----------------------------------------------------- */

function sanitizeValue(value) {
  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    const cleaned = {};
    for (const [key, val] of Object.entries(value)) {
      cleaned[key] = sanitizeValue(val);
    }
    return cleaned;
  }

  return value;
}

/* -----------------------------------------------------
   Express Middleware
----------------------------------------------------- */

export function sanitizeInput(req, res, next) {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }

  if (req.query) {
    const sanitizedQuery = sanitizeValue(req.query);
    if (sanitizedQuery && typeof sanitizedQuery === "object") {
      Object.keys(req.query).forEach((key) => {
        delete req.query[key];
      });
      Object.assign(req.query, sanitizedQuery);
    }
  }

  if (req.params) {
    const sanitizedParams = sanitizeValue(req.params);
    if (sanitizedParams && typeof sanitizedParams === "object") {
      Object.keys(req.params).forEach((key) => {
        delete req.params[key];
      });
      Object.assign(req.params, sanitizedParams);
    }
  }

  next();
}

/* -----------------------------------------------------
   Helpers
----------------------------------------------------- */

/**
 * Normalize email input
 */
export function normalizeEmail(email) {
  if (typeof email !== "string") return email;
  return email.trim().toLowerCase();
}

/**
 * Validate MongoDB ObjectId
 */
export function sanitizeObjectId(id) {
  if (typeof id !== "string") return null;

  const value = id.trim();
  return /^[0-9a-fA-F]{24}$/.test(value) ? value : null;
}

/**
 * Remove sensitive fields before response
 */
export function sanitizeUserOutput(user) {
  if (!user || typeof user !== "object") return null;

  const {
    passwordHash,
    resetOtpHash,
    resetOtpExpiresAt,
    resetTokenHash,
    resetTokenExpiresAt,
    __v,
    ...safe
  } = user;

  return safe;
}
