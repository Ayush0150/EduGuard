import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

export function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = {
      id: payload?.sub,
      role: payload?.role,
    };
    if (!req.user.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
}

export function requireRole(...roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowed.has(role)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    return next();
  };
}
