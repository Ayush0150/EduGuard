import http from "http";
import mongoose from "mongoose";
import { WebSocketServer } from "ws";
import { createApp } from "./app.js";
import { env } from "./core/config/env.js";
import { connectMongo } from "./core/db/connectMongo.js";
import { logger } from "./core/utils/logger.js";

/* ==========================================================
   EduGuard Enterprise WebSocket Server
   ----------------------------------------------------------
   - Single HTTP + WS server on port 8080
   - Device registry with heartbeat monitoring
   - JSON-only packet protocol
   - Telemetry broadcast to all dashboard clients
   - Two-way control routing: dashboard → device → ack
   - Last-known-state cache for new dashboard connections
   ========================================================== */

/** @type {Map<string, import("ws").WebSocket>} deviceId → socket */
const devices = new Map();

/** @type {Map<string, object>} deviceId → last telemetry snapshot */
const lastTelemetry = new Map();

const HEARTBEAT_INTERVAL = 30_000; // 30 s ping interval

/* ── helpers ─────────────────────────────────────────────── */

function sendJson(socket, payload) {
  if (!socket || socket.readyState !== 1) return false;
  socket.send(JSON.stringify(payload));
  return true;
}

function broadcastDashboards(wss, payload) {
  const packet = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    // Send to every connected client that is NOT a registered device
    if (client.readyState === 1 && !client.deviceId) {
      client.send(packet);
    }
  });
}

/* ── bootstrap ───────────────────────────────────────────── */

async function bootstrap() {
  logger.info("Starting EduGuard API server", {
    environment: env.nodeEnv,
    port: env.port,
  });

  /* 1. Database */
  await connectMongo(env.mongoUri);

  /* 2. Express */
  const app = createApp();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  /* expose device map for health endpoint if needed */
  app.locals.websocketDevices = devices;

  /* ── Heartbeat (detect dead sockets) ─────────────────── */
  const heartbeatTimer = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        if (ws.deviceId) {
          devices.delete(ws.deviceId);
          logger.info("Device heartbeat timeout", { device: ws.deviceId });
        }
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  wss.on("close", () => clearInterval(heartbeatTimer));

  /* ── Connection handler ──────────────────────────────── */

  wss.on("connection", (ws) => {
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    logger.info("WebSocket client connected", {
      totalClients: wss.clients.size,
    });

    /* Send last-known telemetry snapshot to new dashboard clients */
    lastTelemetry.forEach((snapshot, deviceId) => {
      sendJson(ws, {
        type: "telemetry",
        device: deviceId,
        payload: snapshot.payload,
        category: snapshot.category,
        cached: true,
      });
    });

    ws.on("message", (raw) => {
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return; // ignore non-JSON
      }

      switch (data.type) {
        /* ── REGISTER (ESP32 device) ─────────────────── */
        case "register": {
          const id = data.device;
          if (!id) break;

          // If another socket is registered for this device, close it
          const prev = devices.get(id);
          if (prev && prev !== ws && prev.readyState === 1) {
            prev.close(4000, "replaced");
          }

          devices.set(id, ws);
          ws.deviceId = id;
          logger.info("Device registered", { device: id });

          // Notify dashboards
          broadcastDashboards(wss, {
            type: "device_status",
            device: id,
            online: true,
          });
          break;
        }

        /* ── TELEMETRY (ESP32 → dashboards) ──────────── */
        case "telemetry": {
          const payload = data.payload;
          const category = data.category || "arduino"; // arduino | wifi | gsm | esp

          // Cache for new clients
          const cacheKey = `${data.device}:${category}`;
          lastTelemetry.set(cacheKey, { payload, category });

          // Broadcast to dashboards only
          broadcastDashboards(wss, {
            type: "telemetry",
            device: data.device,
            payload,
            category,
          });
          break;
        }

        /* ── CONTROL (dashboard → device) ────────────── */
        case "control": {
          const deviceSocket = devices.get(data.device);
          if (deviceSocket && deviceSocket.readyState === 1) {
            sendJson(deviceSocket, {
              type: "control",
              command: data.command,
            });

            sendJson(ws, {
              type: "control_status",
              device: data.device,
              command: data.command,
              status: "sent",
              timestamp: Date.now(),
            });
          } else {
            sendJson(ws, {
              type: "control_status",
              device: data.device,
              command: data.command,
              status: "device_offline",
              timestamp: Date.now(),
            });
          }
          break;
        }

        /* ── CONTROL ACK (device → dashboards) ──────── */
        case "control_ack": {
          broadcastDashboards(wss, {
            type: "control_ack",
            device: data.device,
            command: data.command,
            status: "executed",
            timestamp: Date.now(),
          });
          break;
        }

        default:
          break;
      }
    });

    ws.on("close", () => {
      if (ws.deviceId) {
        // Only remove if this socket is still the registered one
        if (devices.get(ws.deviceId) === ws) {
          devices.delete(ws.deviceId);
        }
        logger.info("Device disconnected", { device: ws.deviceId });

        broadcastDashboards(wss, {
          type: "device_status",
          device: ws.deviceId,
          online: false,
        });
      }
    });

    ws.on("error", (err) => {
      logger.error("WebSocket error", { error: err.message });
    });
  });

  /* 3. Listen */
  server.listen(8080, "0.0.0.0", () => {
    logger.info("Server listening", { port: 8080 });
  });

  /* 4. Graceful Shutdown */
  const shutdown = async (signal) => {
    logger.info("Shutdown initiated", { signal });

    clearInterval(heartbeatTimer);

    // Close all WebSocket connections cleanly
    wss.clients.forEach((ws) => ws.close(1001, "server shutting down"));

    server.close(() => {
      logger.info("HTTP server closed");
    });

    try {
      await mongoose.connection.close(false);
      logger.info("MongoDB connection closed");
      process.exit(0);
    } catch (error) {
      logger.error("Graceful shutdown failed", { error: error.message });
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

/* ── Bootstrap Error Handler ───────────────────────────── */

bootstrap().catch((error) => {
  logger.error("Server startup failed", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
