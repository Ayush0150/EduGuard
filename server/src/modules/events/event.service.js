import { Event } from "./event.model.js";

/**
 * Event type → category + severity mapping
 * (mirrors client-side EVENT_DEFS)
 */
const TYPE_META = {
  emergency: { category: "alert", severity: "critical" },
  acRequest: { category: "alert", severity: "info" },
  washroom: { category: "alert", severity: "warning" },
  teacherAbsent: { category: "attendance", severity: "warning" },
  teacherPresent: { category: "attendance", severity: "info" },
  periodChange: { category: "attendance", severity: "info" },
};

/** Dedup window — ignore duplicate type+device within this many ms */
const DEDUP_WINDOW_MS = 3_000;

/**
 * Save a new event (with deduplication).
 * Returns { ok, data } or { ok: false, reason }.
 */
export async function saveEvent({ type, detail, meta, device, ts }) {
  const typeMeta = TYPE_META[type];
  if (!typeMeta) {
    return { ok: false, reason: "unknown_event_type" };
  }

  const eventTs = ts ? new Date(ts) : new Date();
  const deviceId = device || "CLASSROOM-706";

  /* Dedup: skip if same type+device within window */
  const windowStart = new Date(eventTs.getTime() - DEDUP_WINDOW_MS);
  const dup = await Event.findOne({
    type,
    device: deviceId,
    ts: { $gte: windowStart, $lte: eventTs },
  }).lean();

  if (dup) {
    return { ok: false, reason: "duplicate" };
  }

  const doc = await Event.create({
    type,
    category: typeMeta.category,
    severity: typeMeta.severity,
    detail: detail || null,
    meta: meta || null,
    device: deviceId,
    ts: eventTs,
  });

  return { ok: true, data: doc };
}

/**
 * Query events with optional filters.
 *
 * @param {Object} filters
 * @param {string}  [filters.category]  - alert | attendance | system
 * @param {string}  [filters.type]      - specific event type
 * @param {string}  [filters.device]    - device id
 * @param {string}  [filters.from]      - ISO date string (inclusive)
 * @param {string}  [filters.to]        - ISO date string (inclusive, end of day)
 * @param {string}  [filters.search]    - text search on detail field
 * @param {number}  [filters.page=1]
 * @param {number}  [filters.limit=5000]
 * @param {string}  [filters.sort=-ts]  - sort field (prefix - for desc)
 */
export async function getEvents(filters = {}) {
  const query = {};

  if (filters.category) query.category = filters.category;
  if (filters.type) query.type = filters.type;
  if (filters.device) query.device = filters.device;

  /* Date range */
  if (filters.from || filters.to) {
    query.ts = {};
    if (filters.from) {
      query.ts.$gte = new Date(filters.from);
    }
    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      query.ts.$lte = toDate;
    }
  }

  /* Text search on detail */
  if (filters.search) {
    query.detail = { $regex: filters.search, $options: "i" };
  }

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(10000, Math.max(1, Number(filters.limit) || 5000));
  const skip = (page - 1) * limit;

  /* Sort: default newest first */
  const sortField = filters.sort || "-ts";
  const sortDir = sortField.startsWith("-") ? -1 : 1;
  const sortKey = sortField.replace(/^-/, "");

  const [events, total] = await Promise.all([
    Event.find(query)
      .sort({ [sortKey]: sortDir })
      .skip(skip)
      .limit(limit)
      .lean(),
    Event.countDocuments(query),
  ]);

  return {
    ok: true,
    data: events,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Get summary statistics for events matching filters.
 */
export async function getEventStats(filters = {}) {
  const query = {};
  if (filters.device) query.device = filters.device;
  if (filters.from || filters.to) {
    query.ts = {};
    if (filters.from) query.ts.$gte = new Date(filters.from);
    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      query.ts.$lte = toDate;
    }
  }

  const stats = await Event.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {};
  stats.forEach((s) => {
    result[s._id] = s.count;
  });

  return { ok: true, data: result };
}

/**
 * Purge all events from the database.
 */
export async function purgeAllEvents() {
  const { deletedCount } = await Event.deleteMany({});
  return { ok: true, deleted: deletedCount };
}
