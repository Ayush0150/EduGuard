import { Suggestion } from "./suggestion.model.js";

/* ═══ Spam word list ═══ */
const SPAM_WORDS = [
  "viagra",
  "cialis",
  "casino",
  "lottery",
  "bitcoin",
  "crypto",
  "click here",
  "free money",
  "earn money",
  "make money fast",
  "nigerian prince",
  "xxx",
  "porn",
  "sex",
  "buy now",
  "act now",
  "limited time",
  "congratulations you won",
  "you have been selected",
  "wire transfer",
  "credit card",
  "social security",
  "100% free",
  "risk free",
  "no obligation",
  "mlm",
  "work from home",
  "double your",
  "as seen on",
  "subscribe",
  "unsubscribe",
  "dear friend",
  "dear sir",
  "urgent",
  "hurry",
  "winner",
  "prize",
  "gambling",
  "bet online",
  "pharmacy",
  "pills",
  "weight loss",
  "diet",
  "enlargement",
];

function containsSpam(text) {
  const lower = text.toLowerCase();
  return SPAM_WORDS.find((w) => lower.includes(w)) || null;
}

/**
 * Save a new suggestion to the database.
 */
export async function saveSuggestion({ name, message, category }) {
  if (!name || !message) {
    return { ok: false, status: 400, message: "Name and message are required" };
  }

  if (name.length < 2 || name.length > 100) {
    return {
      ok: false,
      status: 400,
      message: "Name must be between 2 and 100 characters",
    };
  }

  if (message.length < 5 || message.length > 2000) {
    return {
      ok: false,
      status: 400,
      message: "Message must be between 5 and 2000 characters",
    };
  }

  // Spam check on both name and message
  const spamInName = containsSpam(name);
  if (spamInName) {
    return {
      ok: false,
      status: 400,
      message: `Your submission was blocked — name contains prohibited content ("${spamInName}")`,
    };
  }
  const spamInMessage = containsSpam(message);
  if (spamInMessage) {
    return {
      ok: false,
      status: 400,
      message: `Your submission was blocked — message contains prohibited content ("${spamInMessage}")`,
    };
  }

  const doc = await Suggestion.create({
    name: name.trim(),
    message: message.trim(),
    category: category || "general",
  });

  return { ok: true, data: doc };
}

/**
 * Retrieve all suggestions (newest first).
 * Supports: category, search (q), sort, page, limit
 */
export async function getSuggestions(filters = {}) {
  const query = {};

  // Status filter
  if (filters.status) query.status = filters.status;

  // Category filter
  if (filters.category) query.category = filters.category;

  // Text search across name + message
  if (filters.q && filters.q.trim()) {
    const escaped = filters.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ name: regex }, { message: regex }];
  }

  // Sorting
  const sortField = filters.sortBy || "createdAt";
  const sortDir = filters.sortOrder === "asc" ? 1 : -1;
  const allowedSort = ["createdAt", "name", "category", "status"];
  const sort = {
    [allowedSort.includes(sortField) ? sortField : "createdAt"]: sortDir,
  };

  // Pagination
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const skip = (page - 1) * limit;

  const [suggestions, total] = await Promise.all([
    Suggestion.find(query).sort(sort).skip(skip).limit(limit).lean(),
    Suggestion.countDocuments(query),
  ]);

  return {
    ok: true,
    data: suggestions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

/**
 * Update suggestion status.
 */
export async function updateSuggestionStatus(id, status) {
  const allowed = ["pending", "workspace", "done"];
  if (!allowed.includes(status)) {
    return {
      ok: false,
      status: 400,
      message: `Invalid status. Must be one of: ${allowed.join(", ")}`,
    };
  }

  const doc = await Suggestion.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  ).lean();

  if (!doc) return { ok: false, status: 404, message: "Suggestion not found" };
  return { ok: true, data: doc };
}

/**
 * Delete a suggestion by ID.
 */
export async function deleteSuggestion(id) {
  const doc = await Suggestion.findByIdAndDelete(id).lean();
  if (!doc) return { ok: false, status: 404, message: "Suggestion not found" };
  return { ok: true, data: doc };
}

/**
 * Return the current spam word list.
 */
export function getSpamWords() {
  return [...SPAM_WORDS];
}
