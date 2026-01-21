import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/**
 * =====================================================
 * EduGuard Rate Limiter Factory
 * =====================================================
 *
 * Features:
 * - Centralized config
 * - Consistent API error format
 * - Safe for reverse proxies
 * - Production ready
 */

/* -----------------------------------------------------
   Factory
----------------------------------------------------- */

export function createRateLimiter({
  windowMs = 15 * 60 * 1000,
  max = 100,
  message = "Too many requests. Please try again later.",
  standardHeaders = true,
  legacyHeaders = false,
} = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders,
    legacyHeaders,

    keyGenerator: (req) => {
      return `${ipKeyGenerator(req)}:${req.originalUrl}`;
    },

    skip: (req) => {
      // Never rate-limit health checks
      return req.path === "/health";
    },

    handler: (req, res) => {
      return res.status(429).json({
        success: false,
        message,
      });
    },
  });
}

/* -----------------------------------------------------
   Rate Limiters
----------------------------------------------------- */

// General auth protection
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests. Please try again in 15 minutes.",
});

// Strict login protection
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many sign-in attempts. Please try again in 15 minutes.",
});
