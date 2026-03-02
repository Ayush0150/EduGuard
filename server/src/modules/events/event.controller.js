import { asyncHandler } from "../../core/utils/asyncHandler.js";
import { sendSuccess } from "../../core/utils/response.js";
import {
  getEvents,
  getEventStats,
  purgeAllEvents,
  saveEvent,
} from "./event.service.js";

/**
 * POST /api/v1/events
 * Save a new classroom event.
 */
export const createEvent = asyncHandler(async (req, res) => {
  const { type, detail, meta, device, ts } = req.body;

  if (!type) {
    return res
      .status(400)
      .json({ success: false, message: "type is required" });
  }

  const result = await saveEvent({ type, detail, meta, device, ts });

  if (!result.ok) {
    // Duplicate or unknown type — return 200 with info (not a hard error)
    return res
      .status(200)
      .json({ success: true, skipped: true, reason: result.reason });
  }

  return sendSuccess(res, { status: 201, data: result.data });
});

/**
 * GET /api/v1/events
 * Query events with optional filters.
 *
 * Query params: category, type, device, from, to, search, page, limit, sort
 */
export const listEvents = asyncHandler(async (req, res) => {
  const result = await getEvents(req.query);
  return sendSuccess(res, { data: result.data, pagination: result.pagination });
});

/**
 * GET /api/v1/events/stats
 * Aggregated event counts by type.
 *
 * Query params: device, from, to
 */
export const eventStats = asyncHandler(async (req, res) => {
  const result = await getEventStats(req.query);
  return sendSuccess(res, { data: result.data });
});

/**
 * DELETE /api/v1/events
 * Purge all events from the database.
 * Requires authentication (password verification done client-side before calling).
 */
export const deleteAllEvents = asyncHandler(async (_req, res) => {
  const result = await purgeAllEvents();
  return sendSuccess(res, {
    message: `Deleted ${result.deleted} events`,
    data: { deleted: result.deleted },
  });
});
