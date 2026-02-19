/**
 * =====================================================
 * Shared Helper Utilities
 * =====================================================
 *
 * Centralized helper functions used across the codebase.
 * Keeps services and controllers clean and DRY.
 */

import crypto from "crypto";

/* =====================================================
   String Normalization
===================================================== */

/**
 * Normalize any string value (trim whitespace)
 */
export function normalize(value) {
  return String(value ?? "").trim();
}

/**
 * Normalize email (trim + lowercase)
 */
export function normalizeEmail(email) {
  return normalize(email).toLowerCase();
}

/**
 * Normalize username (trim only, preserve case)
 */
export function normalizeUsername(username) {
  return normalize(username);
}

/* =====================================================
   Validation Helpers
===================================================== */

/**
 * Check if value looks like an email address
 */
export function isEmail(value) {
  return normalize(value).includes("@");
}

/**
 * Check if email is a Gmail address
 */
export function isGmailAddress(email) {
  const val = normalizeEmail(email);
  return val.endsWith("@gmail.com") || val.endsWith("@googlemail.com");
}

/**
 * Validate MongoDB ObjectId format
 */
export function isValidObjectId(id) {
  return typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id.trim());
}

/* =====================================================
   Security Helpers
===================================================== */

/**
 * SHA-256 hash (for OTP, tokens, etc.)
 */
export function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

/**
 * Generate cryptographically secure random token
 */
export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Generate 6-digit OTP
 */
export function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

/* =====================================================
   Privacy Helpers
===================================================== */

/**
 * Mask email for logging (show first 2 chars + domain)
 */
export function maskEmail(email) {
  const val = normalizeEmail(email);
  const at = val.indexOf("@");
  if (at <= 2) return "***";
  return `${val.slice(0, 2)}***${val.slice(at)}`;
}

/* =====================================================
   Role Helpers
===================================================== */

const ADMIN_ROLES = Object.freeze(new Set(["ADMIN", "SUPER_ADMIN"]));

/**
 * Check if role is an admin role
 */
export function isAdminRole(role) {
  return ADMIN_ROLES.has(role);
}

/**
 * Check if role is forbidden for user management
 */
export function isForbiddenAdminRole(role) {
  return role && ADMIN_ROLES.has(String(role));
}
