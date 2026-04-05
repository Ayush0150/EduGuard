import { Router } from "express";
import { requireAuth, requireRole } from "../../core/middlewares/auth.js";
import {
  createEvent,
  deleteAllEvents,
  eventStats,
  listEvents,
} from "./event.controller.js";

const router = Router();

/**
 * Event Routes
 * ------------
 * POST   /              — Save a new event
 * GET    /              — Query events (filters via query params)
 * GET    /stats         — Aggregated counts by event type
 * DELETE /              — Purge all events (requires auth)
 */
router.post("/", requireAuth, requireRole("ADMIN", "SUPER_ADMIN"), createEvent);
router.get("/", requireAuth, listEvents);
router.get("/stats", requireAuth, eventStats);
router.delete(
  "/",
  requireAuth,
  requireRole("ADMIN", "SUPER_ADMIN"),
  deleteAllEvents
);

export const eventRouter = router;
