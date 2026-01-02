/**
 * Input sanitization utilities
 * Prevents XSS and injection attacks
 */

/**
 * Sanitize string input by removing potentially harmful characters
 */
export function sanitizeString(input) {
  if (typeof input !== "string") return input;

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove angle brackets
    .slice(0, 1000); // Limit length
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(input) {
  if (typeof input !== "string") return "";

  return input.trim().toLowerCase().slice(0, 254); // RFC 5321 max email length
}

/**
 * Sanitize username (alphanumeric, underscore, hyphen only)
 */
export function sanitizeUsername(input) {
  if (typeof input !== "string") return "";

  return input
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 50);
}

/**
 * Sanitize object by applying sanitizer to all string values
 */
export function sanitizeObject(obj, sanitizer = sanitizeString) {
  if (!obj || typeof obj !== "object") return obj;

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizer(value);
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeObject(value, sanitizer);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
