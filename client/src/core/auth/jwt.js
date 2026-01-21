/**
 * JWT Utilities
 * -------------
 * Handles decoding, validation, expiration checks,
 * and safe user extraction from JWT tokens.
 *
 * Frontend-safe (no secret required).
 */

/* ---------------------------------------------------
   Internal Helpers
--------------------------------------------------- */

/**
 * Safely decode Base64URL string
 */
function base64UrlDecode(value) {
  if (typeof value !== "string") return null;

  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = atob(padded);

    return decodeURIComponent(
      decoded
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
  } catch (err) {
    return null;
  }
}

/* ---------------------------------------------------
   Public API
--------------------------------------------------- */

/**
 * Decode JWT payload
 */
export function decodeJwt(token) {
  if (typeof token !== "string") return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const json = base64UrlDecode(payload);
    return json ? JSON.parse(json) : null;
  } catch (err) {
    return null;
  }
}

/**
 * Check whether JWT is expired
 */
export function isJwtExpired(token, skewSeconds = 30) {
  const payload = decodeJwt(token);
  if (!payload?.exp) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp <= currentTime - skewSeconds;
}

/**
 * Seconds remaining before token expiry
 */
export function getTokenExpiryTime(token) {
  const payload = decodeJwt(token);
  if (!payload?.exp) return 0;

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - now);
}

/**
 * Extract normalized user data from token
 */
export function getUserFromToken(token) {
  const payload = decodeJwt(token);
  if (!payload) return null;

  return {
    id: payload.sub ?? payload.userId ?? payload.id ?? null,
    role: payload.role ?? null,
    email: payload.email ?? null,
  };
}

/**
 * Validate basic JWT format (xxx.yyy.zzz)
 */
export function isValidTokenStructure(token) {
  if (typeof token !== "string") return false;

  const parts = token.split(".");
  return parts.length === 3 && parts.every(Boolean);
}
