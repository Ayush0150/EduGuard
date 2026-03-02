import { Router } from "express";
import { requireAuth } from "../../core/middlewares/auth.js";
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
router.post("/", createEvent);
router.get("/", listEvents);
router.get("/stats", eventStats);
router.delete("/", requireAuth, deleteAllEvents);

export const eventRouter = router;
