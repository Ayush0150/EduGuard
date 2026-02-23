import express from "express";
import mongoose from "mongoose";
import { WebSocket, WebSocketServer } from "ws";
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

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const wss = new WebSocketServer({ port: 8081 });
  let latestData = "";

  wss.on("connection", (ws) => {
    console.log("WebSocket Client Connected");

    if (latestData) {
      ws.send(latestData);
    }
  });

  function broadcast(data) {
    latestData = data;

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  app.locals.broadcast = broadcast;

  /* ---------------------------------------------------
     3. Start HTTP Server
  --------------------------------------------------- */
  const server = app.listen(8080, "0.0.0.0", () => {
    console.log("EduGuard API running on port 8080");
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
