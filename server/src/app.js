import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./core/config/env.js";
import { errorHandler } from "./core/middlewares/errorHandler.js";
import { notFound } from "./core/middlewares/notFound.js";
import { sanitizeInput } from "./core/middlewares/sanitize.js";
import { logger } from "./core/utils/logger.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";

/**
 * Create and configure Express application
 *
 * Middleware stack:
 * 1. Security headers (helmet)
 * 2. CORS configuration
 * 3. Body parsing (express.json)
 * 4. Input sanitization (XSS prevention)
 * 5. Request logging (development only)
 * 6. API routes
 * 7. 404 handler
 * 8. Global error handler
 *
 * @returns {Express} Configured Express application
 */
export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.set("trust proxy", 1);

  app.use(
    helmet({
      // API-only service; configure for production security
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: env.isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:", "https:"],
            },
          }
        : false,
      hsts: env.isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    })
  );

  app.use(compression());

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  );

  app.use(express.json({ limit: "1mb" }));

  // Sanitize all inputs to prevent XSS and injection attacks
  app.use(sanitizeInput);

  // Request logging middleware (only in development)
  if (!env.isProduction) {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        logger.perf.apiRequest(req.method, req.path, duration, res.statusCode);
      });
      next();
    });
  }

  /* ✅ API ROUTES */
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/admin", adminRouter);

  /* ❌ DO NOT change order below */
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
