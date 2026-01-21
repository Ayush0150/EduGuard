import jwt from "jsonwebtoken";

/**
 * =====================================================
 * JWT Security Utilities
 * =====================================================
 *
 * Purpose:
 * - Issue short-lived access tokens
 * - Validate authenticated users
 *
 * Design principles:
 * - Minimal payload
 * - Strong signing secret
 * - Explicit expiration
 * - Predictable token structure
 *
 * NOTE:
 * Access tokens should be short-lived.
 * Refresh tokens (if used) must be stored securely.
 */

/**
 * Sign access token
 *
 * @param {Object} payload
 * @param {string} payload.userId - MongoDB user ID
 * @param {string} payload.role - User role
 *
 * @param {Object} options
 * @param {string} options.secret - JWT secret key
 * @param {string|number} options.expiresIn - Token expiry (e.g. "15m")
 */
export function signAccessToken(
  { userId, role },
  { secret, expiresIn }
) {
  if (!userId) {
    throw new Error("JWT signing failed: userId is required");
  }

  if (!secret) {
    throw new Error("JWT signing failed: secret is missing");
  }

  return jwt.sign(
    {
      sub: userId,     // Standard JWT subject
      role,            // Authorization
    },
    secret,
    {
      expiresIn,
      issuer: "eduguard-api",
      audience: "eduguard-client",
    }
  );
}

/**
 * Verify and decode access token
 */
export function verifyAccessToken(token, secret) {
  if (!token) {
    throw new Error("JWT token missing");
  }

  if (!secret) {
    throw new Error("JWT secret missing");
  }

  return jwt.verify(token, secret, {
    issuer: "eduguard-api",
    audience: "eduguard-client",
  });
}
