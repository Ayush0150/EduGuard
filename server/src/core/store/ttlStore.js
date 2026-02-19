import crypto from "crypto";

/**
 * =====================================================
 * TTL Store (In-Memory Expiring Key-Value Store)
 * =====================================================
 *
 * Use cases:
 * - Login attempt tracking
 * - OTP storage
 * - Temporary tokens
 * - Rate-limit helpers
 *
 * Characteristics:
 * - In-memory
 * - Auto-expiring values
 * - No external dependencies
 *
 * IMPORTANT:
 * - Data is lost on server restart
 * - Not suitable for multi-server deployments
 * - Replace with Redis in production scaling
 */

export class TtlStore {
  constructor({ ttlMs = 5 * 60 * 1000, cleanupIntervalMs = 60 * 1000 } = {}) {
    this.ttlMs = ttlMs;
    this.map = new Map();
    this.lastCleanup = Date.now();
    this.cleanupIntervalMs = cleanupIntervalMs;

    // Adaptive cleanup - only run if store has entries
    this.cleanupTimer = setInterval(() => {
      if (this.map.size > 0) {
        this.cleanup();
      }
    }, cleanupIntervalMs);

    // Allow Node process to exit normally
    this.cleanupTimer.unref?.();
  }

  /**
   * Store value with expiration
   */
  set(key, value) {
    this.map.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Retrieve value if not expired
   */
  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    if (Date.now() >= entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Remove key manually
   */
  delete(key) {
    this.map.delete(key);
  }

  /**
   * Clear entire store
   */
  clear() {
    this.map.clear();
  }

  /**
   * Cleanup expired entries
   * (Now runs only when map has entries - adaptive optimization)
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.map.entries()) {
      if (now >= entry.expiresAt) {
        this.map.delete(key);
        cleanedCount++;
      }
    }

    this.lastCleanup = now;

    // Return stats for monitoring
    return {
      cleanedCount,
      remainingSize: this.map.size,
      lastCleanup: this.lastCleanup,
    };
  }

  /**
   * Generate cryptographically secure token
   * Useful for reset tokens, session IDs, etc.
   */
  static createToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString("hex");
  }

  /**
   * Destroy store (for graceful shutdown/testing)
   */
  destroy() {
    clearInterval(this.cleanupTimer);
    this.map.clear();
  }
}
