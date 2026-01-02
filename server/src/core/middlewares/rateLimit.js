import rateLimit from "express-rate-limit";

export function createRateLimiter({
  windowMs,
  max,
  message,
  standardHeaders = true,
  legacyHeaders = false,
} = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders,
    legacyHeaders,
    message: {
      success: false,
      message: message ?? "Too many requests. Please try again later.",
    },
  });
}

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests. Please try again in 15 minutes.",
});

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many sign-in attempts. Please try again in 15 minutes.",
});
