import jwt from "jsonwebtoken";
import { User } from "../../modules/users/user.model.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Extract Bearer token from Authorization header
 */
function getBearerToken(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader || typeof authHeader !== "string") return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token || token === "null") return null;

  return token;
}

/**
 * Authentication middleware - verifies JWT and ensures user is active
 */
export async function requireAuth(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    logger.security.unauthorizedAccess({
      ip: req.ip,
      path: req.path,
      reason: "No token provided",
    });
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    const userId = payload?.id || payload?.userId || payload?.sub;

    if (!userId) {
      logger.security.unauthorizedAccess({
        ip: req.ip,
        path: req.path,
        reason: "Invalid token payload",
      });
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    // Verify user exists and is active
    const user = await User.findById(userId)
      .select("isActive role email")
      .lean();

    if (!user || !user.isActive) {
      logger.security.unauthorizedAccess({
        ip: req.ip,
        path: req.path,
        userId,
        reason: "Inactive or non-existent user",
      });
      return res.status(401).json({
        success: false,
        message: "Account is inactive or does not exist",
      });
    }

    req.user = {
      id: userId,
      role: user.role,
      email: user.email,
    };

    next();
  } catch (err) {
    logger.security.unauthorizedAccess({
      ip: req.ip,
      path: req.path,
      reason: err.message,
    });
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
}

/**
 * Role-based authorization middleware
 * Usage: requireRole("ADMIN", "SUPER_ADMIN")
 */
export function requireRole(...roles) {
  const allowedRoles = new Set(roles);

  return (req, res, next) => {
    if (!req.user || !allowedRoles.has(req.user.role)) {
      logger.security.unauthorizedAccess({
        ip: req.ip,
        path: req.path,
        userId: req.user?.id,
        reason: `Insufficient role: ${req.user?.role}`,
      });
      return res.status(403).json({
        success: false,
        message: "Forbidden: Insufficient permissions",
      });
    }
    next();
  };
}

/**
 * Middleware to ensure only non-admin users (USER, SECURITY, MAINTENANCE, PRINCIPAL)
 */
export function requireNonAdminUser(req, res, next) {
  const role = req.user?.role;

  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    logger.security.unauthorizedAccess({
      ip: req.ip,
      path: req.path,
      userId: req.user?.id,
      reason: "Admin attempted to access user route",
    });
    return res.status(403).json({
      success: false,
      message: "Admins cannot access user routes. Please use admin routes.",
    });
  }

  next();
}
