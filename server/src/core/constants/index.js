/**
 * =====================================================
 * EduGuard Global Constants
 * =====================================================
 *
 * Centralized constants for the entire application.
 * Prevents magic numbers and improves maintainability.
 */

/* =====================================================
   Authentication
===================================================== */

export const AUTH = Object.freeze({
  // Login attempt limits
  MAX_LOGIN_ATTEMPTS: 10,
  LOGIN_LOCK_DURATION_MS: 15 * 60 * 1000, // 15 minutes

  // OTP settings
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
  ADMIN_LOGIN_OTP_EXPIRY_MINUTES: 5,

  // Reset token
  RESET_TOKEN_EXPIRY_MINUTES: 15,
  RESET_TOKEN_BYTES: 32,

  // Session
  SESSION_DURATION_DAYS: 7,
  JWT_CLOCK_TOLERANCE_SECONDS: 60,
});

/* =====================================================
   User Roles
===================================================== */

export const ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  PRINCIPAL: "PRINCIPAL",
  SECURITY: "SECURITY",
  MAINTENANCE: "MAINTENANCE",
  USER: "USER",
});

export const ADMIN_ROLES = Object.freeze([ROLES.ADMIN, ROLES.SUPER_ADMIN]);

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

/* =====================================================
   Validation Limits
===================================================== */

export const LIMITS = Object.freeze({
  // Input lengths
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  EMAIL_MAX: 255,
  USERNAME_MIN: 3,
  USERNAME_MAX: 50,

  // Request
  JSON_BODY_LIMIT: "1mb",
  REQUEST_TIMEOUT_MS: 15000,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
});

/* =====================================================
   Rate Limiting
===================================================== */

export const RATE_LIMITS = Object.freeze({
  // General
  AUTH_WINDOW_MS: 15 * 60 * 1000,
  AUTH_MAX_REQUESTS: 100,

  // Login
  LOGIN_WINDOW_MS: 15 * 60 * 1000,
  LOGIN_MAX_REQUESTS: 20,

  // OTP
  OTP_WINDOW_MS: 60 * 1000,
  OTP_MAX_REQUESTS: 3,

  // Password reset
  RESET_WINDOW_MS: 60 * 60 * 1000,
  RESET_MAX_REQUESTS: 5,
});

/* =====================================================
   HTTP Status Codes
===================================================== */

export const HTTP = Object.freeze({
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
});

/* =====================================================
   Error Messages
===================================================== */

export const MESSAGES = Object.freeze({
  // Auth
  INVALID_CREDENTIALS: "Invalid credentials.",
  UNAUTHORIZED: "Unauthorized",
  FORBIDDEN: "Forbidden: insufficient permissions",
  SESSION_EXPIRED: "Session expired. Please sign in again.",
  ACCOUNT_DISABLED: "Account is inactive or does not exist",

  // Rate limiting
  TOO_MANY_REQUESTS: "Too many requests. Please try again later.",
  LOGIN_LOCKED:
    "Too many failed sign-in attempts. Please try again after 15 minutes.",

  // OTP
  OTP_SENT: "Verification code sent to your email.",
  OTP_INVALID: "Invalid or expired verification code.",
  OTP_EXPIRED: "Verification code has expired. Please request a new one.",

  // General
  INTERNAL_ERROR: "Internal server error",
  NOT_FOUND: "Resource not found",
  VALIDATION_ERROR: "Invalid request data",
});
