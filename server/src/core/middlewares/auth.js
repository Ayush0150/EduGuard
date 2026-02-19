import { User } from "../../modules/users/user.model.js";
import { userCache } from "../cache/userCache.js";
import { env } from "../config/env.js";
import { verifyAccessToken } from "../security/jwt.js";
import { logger } from "../utils/logger.js";

/* =====================================================
   Helpers
===================================================== */

/**
 * Extract Bearer token from Authorization header
 */
function getBearerToken(req) {
  const header = req.headers?.authorization;

  if (!header || typeof header !== "string") return null;

  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token || token === "null") return null;

  return token;
}

/* =====================================================
   Authentication Middleware
===================================================== */

/**
 * requireAuth
 * -----------
 * Verifies JWT access token and ensures:
 * - Token is valid
 * - User exists
 * - User is active
 */
export async function requireAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    logger.security.unauthorizedAccess({
      ip: req.ip,
      path: req.originalUrl,
      reason: "Missing access token",
    });

    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    const payload = verifyAccessToken(token, env.jwtSecret);

    // Support multiple token formats
    const userId = payload?.sub || payload?.userId || payload?.id;

    if (!userId) {
      logger.security.unauthorizedAccess({
        ip: req.ip,
        path: req.originalUrl,
        reason: "Invalid JWT payload",
      });

      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Try cache first (70-90% hit rate in production)
    let user = userCache.get(userId);

    // Cache miss - query database
    if (!user) {
      user = await User.findById(userId).select("role email isActive").lean();

      // Cache for future requests
      if (user && user.isActive) {
        userCache.set(userId, user);
      }
    }

    if (!user || !user.isActive) {
      logger.security.unauthorizedAccess({
        ip: req.ip,
        path: req.originalUrl,
        userId,
        reason: "User not found or inactive",
      });

      return res.status(401).json({
        success: false,
        message: "Account is inactive or does not exist",
      });
    }

    // Attach safe user context
    req.user = {
      id: userId,
      role: user.role,
      email: user.email,
    };

    next();
  } catch (error) {
    logger.security.unauthorizedAccess({
      ip: req.ip,
      path: req.originalUrl,
      reason: error.message,
    });

    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
}

/* =====================================================
   Role Authorization
===================================================== */

/**
 * requireRole
 * -----------
 * Role-based authorization
 *
 * Usage:
 *   requireRole("ADMIN", "SUPER_ADMIN")
 */
export function requireRole(...roles) {
  const allowedRoles = new Set(roles);

  return (req, res, next) => {
    if (!req.user || !allowedRoles.has(req.user.role)) {
      logger.security.unauthorizedAccess({
        ip: req.ip,
        path: req.originalUrl,
        userId: req.user?.id,
        reason: `Insufficient role: ${req.user?.role}`,
      });

      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }

    next();
  };
}

/* =====================================================
   Non-Admin Guard
===================================================== */

/**
 * requireNonAdminUser
 * -------------------
 * Blocks ADMIN / SUPER_ADMIN from accessing user routes
 */
export function requireNonAdminUser(req, res, next) {
  const role = req.user?.role;

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    logger.security.unauthorizedAccess({
      ip: req.ip,
      path: req.originalUrl,
      userId: req.user?.id,
      reason: "Admin attempted to access user-only route",
    });

    return res.status(403).json({
      success: false,
      message: "Admins must use admin routes",
    });
  }

  next();
}
