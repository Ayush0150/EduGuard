import http from "http";
import mongoose from "mongoose";
import { WebSocketServer } from "ws";
import { createApp } from "./app.js";
import { env } from "./core/config/env.js";
import { connectMongo } from "./core/db/connectMongo.js";
import { getAuthContextFromToken } from "./core/middlewares/auth.js";
import { logger } from "./core/utils/logger.js";
import { saveEvent } from "./modules/events/event.service.js";
import { SmsCounter } from "./modules/sms/smsCounter.model.js";
import {
  patchPayloadWithAuthCounters,
  toGsmPayloadWithCounters,
  upsertSmsCounterFromTelemetry,
} from "./modules/sms/smsCounter.service.js";

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
const lastArduinoState = new Map();

const HEARTBEAT_INTERVAL = 10_000; // 10 s ping interval
const DEVICE_STALE_MS = 15_000; // device silent for 15 s → considered dead
const WS_AUTH_TIMEOUT_MS = 5_000;

/* ── helpers ─────────────────────────────────────────────── */

function sendJson(socket, payload) {
  if (!socket || socket.readyState !== 1) return false;
  socket.send(JSON.stringify(payload));
  return true;
}

function broadcastDashboards(wss, payload) {
  const packet = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (
      client.readyState === 1 &&
      client.clientType === "dashboard" &&
      client.isAuthorized === true
    ) {
      client.send(packet);
    }
  });
}

function bootstrapDashboardSocket(ws) {
  devices.forEach((_deviceSocket, deviceId) => {
    sendJson(ws, {
      type: "device_status",
      device: deviceId,
      online: true,
    });
  });

  lastTelemetry.forEach((snapshot, deviceId) => {
    sendJson(ws, {
      type: "telemetry",
      device: deviceId,
      payload: snapshot.payload,
      category: snapshot.category,
      cached: true,
    });
  });
}

function rejectSocket(ws, message, code = 4001) {
  sendJson(ws, { type: "auth_error", message });
  ws.close(code, message);
}

function isAuthorizedDevice(ws, data) {
  return (
    ws.clientType === "device" &&
    ws.isAuthorized === true &&
    ws.deviceId &&
    data?.device === ws.deviceId
  );
}

function parsePayloadToObject(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed || trimmed.startsWith("Waiting")) return {};

  const obj = {};
  let lastKey = null;

  trimmed.split(",").forEach((part) => {
    const p = part.trim();
    if (!p) return;

    if (p.includes("=")) {
      const i = p.indexOf("=");
      let key = p.slice(0, i).trim();
      if (key.includes(":")) key = key.split(":")[1];
      lastKey = key;
      obj[lastKey] = p.slice(i + 1).trim();
      return;
    }

    if (p.includes(":")) {
      const i = p.indexOf(":");
      lastKey = p.slice(0, i).trim();
      obj[lastKey] = p.slice(i + 1).trim();
      return;
    }

    if (lastKey) {
      obj[lastKey] += `, ${p}`;
    }
  });

  return obj;
}

async function persistDerivedArduinoEvents(device, payload) {
  const parsed = parsePayloadToObject(payload);
  const snap = {
    emergency: parsed.isEmergencyReq === "true",
    ac: parsed.isACReq === "true",
    washroom: parsed.isWashroomDirty === "true",
    absent: parsed.isTeacherAbsent === "true",
    present: parsed.isPresent === "true",
    period: parsed.P || null,
    room: parsed.class || parsed.classroom || device.replace(/^CLASSROOM-/, ""),
    parsed,
  };

  const prev = lastArduinoState.get(device);
  if (!prev) {
    lastArduinoState.set(device, snap);
    return;
  }

  const tasks = [];

  if (snap.emergency && !prev.emergency) {
    tasks.push(
      saveEvent({
        type: "emergency",
        device,
        meta: {
          Room: snap.room || "—",
          Period: parsed.P || "—",
          Gas: parsed.GS || "—",
        },
      })
    );
  }

  if (snap.ac && !prev.ac) {
    tasks.push(
      saveEvent({
        type: "acRequest",
        device,
        meta: {
          Room: snap.room || "—",
          Period: parsed.P || "—",
        },
      })
    );
  }

  if (snap.washroom && !prev.washroom) {
    tasks.push(
      saveEvent({
        type: "washroom",
        device,
        meta: {
          "Gas Level": parsed.GS ? `${parsed.GS} ppm` : "—",
          Room: snap.room || "—",
          Period: parsed.P || "—",
        },
      })
    );
  }

  if (snap.absent && !prev.absent) {
    tasks.push(
      saveEvent({
        type: "teacherAbsent",
        device,
        meta: {
          Period: parsed.P || "—",
          "Time Elapsed": parsed.PT ? `${parsed.PT}s` : "—",
        },
      })
    );
  }

  if (snap.present && !prev.present) {
    tasks.push(
      saveEvent({
        type: "teacherPresent",
        device,
        meta: {
          Period: parsed.P || "—",
          "Arrival At": parsed.T || "—",
        },
      })
    );
  }

  if (snap.period && prev.period && snap.period !== prev.period) {
    tasks.push(
      saveEvent({
        type: "periodChange",
        device,
        detail: `Period ${snap.period} started`,
        meta: {
          "New Period": snap.period,
          Previous: prev.period,
        },
      })
    );
  }

  const results = await Promise.allSettled(tasks);
  results.forEach((result) => {
    if (result.status === "rejected") {
      logger.warn("Derived event persistence failed", {
        device,
        error: result.reason?.message || String(result.reason),
      });
    }
  });

  lastArduinoState.set(device, snap);
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

  const persistedCounters = await SmsCounter.find({}).lean();
  persistedCounters.forEach((doc) => {
    const payload = toGsmPayloadWithCounters(doc);
    if (!payload) return;
    const cacheKey = `${doc.device}:gsm`;
    lastTelemetry.set(cacheKey, { payload, category: "gsm" });
  });

  /* expose device map for health endpoint if needed */
  app.locals.websocketDevices = devices;

  /* ── Heartbeat (detect dead sockets) ─────────────────── */
  const heartbeatTimer = setInterval(() => {
    const now = Date.now();
    wss.clients.forEach((ws) => {
      /* Device staleness: if a registered device hasn't sent anything for 15 s, kill it */
      if (
        ws.deviceId &&
        ws.lastMessageAt &&
        now - ws.lastMessageAt > DEVICE_STALE_MS
      ) {
        devices.delete(ws.deviceId);
        logger.info("Device stale — no data received", { device: ws.deviceId });
        return ws.terminate();
      }

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
    ws.isAuthorized = false;
    ws.clientType = null;
    ws.user = null;
    ws.authTimer = setTimeout(() => {
      if (!ws.isAuthorized && ws.readyState === 1) {
        rejectSocket(ws, "Authentication required", 4001);
      }
    }, WS_AUTH_TIMEOUT_MS);

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    logger.info("WebSocket client connected", {
      totalClients: wss.clients.size,
    });

    ws.on("message", async (raw) => {
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return; // ignore non-JSON
      }

      if (data.type === "auth") {
        try {
          const user = await getAuthContextFromToken(data.token);
          ws.isAuthorized = true;
          ws.clientType = "dashboard";
          ws.user = user;
          clearTimeout(ws.authTimer);
          sendJson(ws, {
            type: "auth_ok",
            role: user.role,
            email: user.email,
          });
          bootstrapDashboardSocket(ws);
        } catch (error) {
          logger.security.unauthorizedAccess({
            path: "websocket",
            reason: `Dashboard WS auth failed: ${error.message}`,
          });
          rejectSocket(ws, "WebSocket authentication failed", 4001);
        }
        return;
      }

      switch (data.type) {
        /* ── REGISTER (ESP32 device) ─────────────────── */
        case "register": {
          if (
            env.deviceWsSecret &&
            String(data.secret || "") !== env.deviceWsSecret
          ) {
            logger.security.unauthorizedAccess({
              path: "websocket",
              reason: `Device WS auth failed for ${data.device || "unknown device"}`,
            });
            return rejectSocket(ws, "Device authentication failed", 4003);
          }

          const id = data.device;
          if (!id) break;

          // If another socket is registered for this device, close it
          const prev = devices.get(id);
          if (prev && prev !== ws && prev.readyState === 1) {
            prev.close(4000, "replaced");
          }

          devices.set(id, ws);
          ws.deviceId = id;
          ws.lastMessageAt = Date.now();
          ws.isAuthorized = true;
          ws.clientType = "device";
          clearTimeout(ws.authTimer);
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
          if (!isAuthorizedDevice(ws, data)) break;

          let payload = data.payload;
          const category = data.category || "arduino"; // arduino | wifi | gsm | esp

          /* Update last-seen timestamp for staleness detection */
          if (ws.deviceId) ws.lastMessageAt = Date.now();

          if (category === "gsm" && data.device) {
            try {
              const result = await upsertSmsCounterFromTelemetry(
                data.device,
                payload
              );
              // Patch payload with server-authoritative counter values
              // so dashboards always see the correct persisted totals.
              if (result.ok && result.data) {
                payload = patchPayloadWithAuthCounters(payload, result.data);
              }
            } catch (error) {
              logger.warn("SMS counter persistence skipped", {
                device: data.device,
                error: error.message,
              });
            }
          }

          // Cache for new clients
          const cacheKey = `${data.device}:${category}`;
          lastTelemetry.set(cacheKey, { payload, category });

          if (category === "arduino" && data.device) {
            await persistDerivedArduinoEvents(data.device, payload);
          }

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
          if (ws.clientType !== "dashboard" || ws.isAuthorized !== true) {
            break;
          }

          const deviceSocket = devices.get(data.device);
          if (deviceSocket && deviceSocket.readyState === 1) {
            // Send RAW command string — ESP32 expects plain text, not JSON
            deviceSocket.send(data.command);
            logger.info("Control sent to device", {
              device: data.device,
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
            logger.warn("Control failed — device offline", {
              device: data.device,
              command: data.command,
            });
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
          if (!isAuthorizedDevice(ws, data)) break;

          if (ws.deviceId) ws.lastMessageAt = Date.now();
          broadcastDashboards(wss, {
            type: "control_ack",
            device: data.device,
            command: data.command || data.payload,
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
      clearTimeout(ws.authTimer);
      if (ws.deviceId) {
        // Only remove if this socket is still the registered one
        if (devices.get(ws.deviceId) === ws) {
          devices.delete(ws.deviceId);
        }
        lastArduinoState.delete(ws.deviceId);
        logger.info("Device disconnected", { device: ws.deviceId });

        /* ── Mark cached GSM as offline so new clients don't see stale data ── */
        const gsmCacheKey = `${ws.deviceId}:gsm`;
        const cachedGsm = lastTelemetry.get(gsmCacheKey);
        if (cachedGsm) {
          // Preserve SMS counters but set gsmReady=false and clear live fields
          const offlinePayload = cachedGsm.payload
            .replace(/gsmReady=true/g, "gsmReady=false")
            .replace(/signal=[^,]*/g, "signal=N/A")
            .replace(/reg=[^,]*/g, "reg=N/A");
          lastTelemetry.set(gsmCacheKey, {
            payload: offlinePayload,
            category: "gsm",
          });
          // Push offline GSM state to all dashboards immediately
          broadcastDashboards(wss, {
            type: "telemetry",
            device: ws.deviceId,
            payload: offlinePayload,
            category: "gsm",
          });
        }

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
  server.listen(env.port, "0.0.0.0", () => {
    logger.info("Server listening", { port: env.port });
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
