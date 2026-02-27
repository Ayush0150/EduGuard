import { Router } from "express";
import { createEvent, eventStats, listEvents } from "./event.controller.js";

const router = Router();

/**
 * Event Routes
 * ------------
 * POST   /              — Save a new event
 * GET    /              — Query events (filters via query params)
 * GET    /stats         — Aggregated counts by event type
 */
router.post("/", createEvent);
router.get("/", listEvents);
router.get("/stats", eventStats);

export const eventRouter = router;
