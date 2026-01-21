/**
 * =====================================================
 * Input Sanitization Utilities
 * =====================================================
 *
 * Purpose:
 * - Reduce XSS and injection risk
 * - Normalize user input
 * - Improve data consistency
 *
 * IMPORTANT:
 * - Sanitization is NOT security by itself
 * - Backend validation & escaping are still required
 * - Database queries must remain parameterized
 *
 * This layer exists purely for safety + UX consistency.
 */

/* -----------------------------------------------------
   Constants
----------------------------------------------------- */

const MAX_GENERIC_LENGTH = 1000;
const MAX_EMAIL_LENGTH = 254;
const MAX_USERNAME_LENGTH = 50;

/* -----------------------------------------------------
   Generic string sanitizer
----------------------------------------------------- */

export function sanitizeString(value) {
  if (typeof value !== "string") return value;

  return value
    .trim()
    .replace(/[<>]/g, "") // basic XSS reduction
    .slice(0, MAX_GENERIC_LENGTH);
}

/* -----------------------------------------------------
   Email sanitizer
----------------------------------------------------- */

export function sanitizeEmail(value) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .slice(0, MAX_EMAIL_LENGTH);
}

/* -----------------------------------------------------
   Username sanitizer
----------------------------------------------------- */

export function sanitizeUsername(value) {
  if (typeof value !== "string") return "";

  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, MAX_USERNAME_LENGTH);
}

/* -----------------------------------------------------
   Deep object sanitizer
----------------------------------------------------- */

export function sanitizeObject(
  obj,
  sanitizer = sanitizeString,
  seen = new WeakSet()
) {
  if (!obj || typeof obj !== "object") return obj;

  // Prevent circular reference crashes
  if (seen.has(obj)) return obj;
  seen.add(obj);

  const output = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      output[key] = sanitizer(value);
    } else if (typeof value === "object" && value !== null) {
      output[key] = sanitizeObject(value, sanitizer, seen);
    } else {
      output[key] = value;
    }
  }

  return output;
}
