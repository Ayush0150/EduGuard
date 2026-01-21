import bcrypt from "bcryptjs";

/**
 * =====================================================
 * Password Security Utilities
 * =====================================================
 *
 * Features:
 * - Industry-standard bcrypt hashing
 * - Adaptive cost factor
 * - Secure comparison
 *
 * bcrypt advantages:
 * - Salted automatically
 * - Resistant to rainbow table attacks
 * - Computationally expensive by design
 */

const SALT_ROUNDS = 12;

/**
 * Hash plaintext password
 */
export async function hashPassword(plainText) {
  if (!plainText || typeof plainText !== "string") {
    throw new Error("Password must be a non-empty string");
  }

  return bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * Verify plaintext password against stored hash
 */
export async function verifyPassword(plainText, passwordHash) {
  if (!plainText || !passwordHash) return false;

  return bcrypt.compare(plainText, passwordHash);
}
