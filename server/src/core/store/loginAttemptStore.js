import { TtlStore } from "./ttlStore.js";

/**
 * =====================================================
 * Login Attempt Store
 * =====================================================
 *
 * Purpose:
 * - Protect authentication endpoints from brute-force attacks
 * - Track failed login attempts per identifier + IP
 * - Automatically expire records after cooldown period
 *
 * Characteristics:
 * - In-memory (fast)
 * - TTL-based cleanup
 * - Stateless across restarts (acceptable for auth throttling)
 *
 * NOTE:
 * This does NOT replace rate limiting.
 * It adds an additional security layer.
 */

const ATTEMPT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class LoginAttemptStore {
  constructor({ ttlMs = ATTEMPT_TTL_MS } = {}) {
    this.store = new TtlStore({ ttlMs });
  }

  /**
   * Generate unique attempt key per user + IP
   */
  key({ identifier, ip }) {
    return `${String(identifier ?? "")
      .trim()
      .toLowerCase()}|${ip}`;
  }

  /**
   * Get current failed attempt count
   */
  getAttempts(key) {
    return Number(this.store.get(key)) || 0;
  }

  /**
   * Increment failed attempt count
   */
  increment(key) {
    const next = this.getAttempts(key) + 1;
    this.store.set(key, next);
    return next;
  }

  /**
   * Clear attempts after successful login
   */
  reset(key) {
    this.store.delete(key);
  }
}

/**
 * Shared singleton instance
 */
export const loginAttemptStore = new LoginAttemptStore();
