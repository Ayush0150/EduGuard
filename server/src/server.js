import mongoose from "mongoose";
import { createApp } from "./app.js";
import { env } from "./core/config/env.js";
import { connectMongo } from "./core/db/connectMongo.js";
import { logger } from "./core/utils/logger.js";

/**
 * EduGuard API Server Bootstrap
 * -----------------------------
 * Responsibilities:
 * 1. Establish MongoDB connection
 * 2. Initialize Express application
 * 3. Start HTTP server
 * 4. Handle graceful shutdown
 *
 * This file contains NO business logic.
 * It only manages application lifecycle.
 */

async function bootstrap() {
  logger.info("Starting EduGuard API server", {
    environment: env.nodeEnv,
    port: env.port,
  });

  /* ---------------------------------------------------
     1. Database Connection
  --------------------------------------------------- */
  await connectMongo(env.mongoUri);

  /* ---------------------------------------------------
     2. Create Express App
  --------------------------------------------------- */
  const app = createApp();

  /* ---------------------------------------------------
     3. Start HTTP Server
  --------------------------------------------------- */
  const server = app.listen(env.port, () => {
    logger.info("EduGuard API server running", {
      url: `http://localhost:${env.port}`,
      port: env.port,
      environment: env.nodeEnv,
    });
  });

  /* ---------------------------------------------------
     4. Graceful Shutdown
  --------------------------------------------------- */
  const shutdown = async (signal) => {
    logger.info("Shutdown initiated", { signal });

    // Stop accepting new requests
    server.close(() => {
      logger.info("HTTP server closed");
    });

    try {
      await mongoose.connection.close(false);
      logger.info("MongoDB connection closed");

      process.exit(0);
    } catch (error) {
      logger.error("Graceful shutdown failed", {
        error: error.message,
      });
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

/* ---------------------------------------------------
   Bootstrap Error Handler
--------------------------------------------------- */

bootstrap().catch((error) => {
  logger.error("Server startup failed", {
    error: error.message,
    stack: error.stack,
  });

  process.exit(1);
});
