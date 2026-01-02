/**
 * JWT Utilities - Production Grade
 *
 * Handles JWT decoding, validation, and expiry checks
 * with proper error handling and security considerations
 */

/**
 * Decode base64url string to JSON
 */
function base64UrlDecode(value) {
  if (!value || typeof value !== "string") return null;

  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);

    return decodeURIComponent(
      decoded
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
  } catch (error) {
    console.error("Base64 decode error:", error);
    return null;
  }
}

/**
 * Decode JWT token and extract payload
 */
export function decodeJwt(token) {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payloadJson = base64UrlDecode(parts[1]);
    if (!payloadJson) return null;

    const payload = JSON.parse(payloadJson);
    return payload;
  } catch (error) {
    console.error("JWT decode error:", error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 * @param {string} token - JWT token
 * @param {number} skewSeconds - Clock skew tolerance in seconds
 * @returns {boolean} True if expired or invalid
 */
export function isJwtExpired(token, skewSeconds = 30) {
  if (!token) return true;

  const payload = decodeJwt(token);
  if (!payload) return true;

  const exp = payload.exp;
  if (!exp || typeof exp !== "number") return true;

  const nowSeconds = Math.floor(Date.now() / 1000);
  return exp <= nowSeconds - skewSeconds;
}

/**
 * Get time until token expiration in seconds
 */
export function getTokenExpiryTime(token) {
  const payload = decodeJwt(token);
  if (!payload?.exp) return 0;

  const nowSeconds = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - nowSeconds);
}

/**
 * Extract user info from token
 */
export function getUserFromToken(token) {
  const payload = decodeJwt(token);
  if (!payload) return null;

  return {
    id: payload.sub || payload.userId || payload.id,
    role: payload.role,
    email: payload.email,
  };
}

/**
 * Validate token structure without checking expiry
 */
export function isValidTokenStructure(token) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}
