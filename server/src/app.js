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
 * Express Application Factory
 * ---------------------------
 * Creates and configures the EduGuard API server.
 *
 * Lifecycle:
 * - Security
 * - Performance
 * - Network
 * - Parsing
 * - Sanitization
 * - Logging
 * - Routing
 * - Error handling
 *
 * @returns {import("express").Express}
 */
export function createApp() {
  const app = express();

  /* =====================================================
     Core Express Settings
  ===================================================== */

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  /* =====================================================
     Security Middleware
  ===================================================== */

  app.use(
    helmet({
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

  /* =====================================================
     Performance
  ===================================================== */

  app.use(compression());

  /* =====================================================
     CORS Configuration
  ===================================================== */

  const devOriginAllowlist = [/^http:\/\/(localhost|127\.0\.0\.1):\d+$/];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow non-browser clients (Postman, curl)
        if (!origin) return callback(null, true);

        // Production: strict origin
        if (env.isProduction) {
          return callback(null, origin === env.clientOrigin);
        }

        // Development: allow localhost on any port
        if (origin === env.clientOrigin) return callback(null, true);
        if (devOriginAllowlist.some((re) => re.test(origin)))
          return callback(null, true);

        return callback(new Error(`CORS blocked origin: ${origin}`));
      },
      credentials: true,
    })
  );

  /* =====================================================
     Body Parsing
  ===================================================== */

  app.use(express.json({ limit: "1mb" }));

  /* =====================================================
     Input Sanitization
  ===================================================== */

  app.use(sanitizeInput);

  /* =====================================================
     Request Logging (development only)
  ===================================================== */

  if (!env.isProduction) {
    app.use((req, res, next) => {
      const start = Date.now();

      res.on("finish", () => {
        const duration = Date.now() - start;
        logger.perf.apiRequest(
          req.method,
          req.originalUrl,
          duration,
          res.statusCode
        );
      });

      next();
    });
  }

  /* =====================================================
     Health Check
  ===================================================== */

  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      service: "EduGuard API",
      environment: env.nodeEnv,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  /* =====================================================
     API Routes
  ===================================================== */

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/admin", adminRouter);

  /* =====================================================
     Error Handling (DO NOT CHANGE ORDER)
  ===================================================== */

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

