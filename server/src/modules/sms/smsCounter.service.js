import { SmsCounter } from "./smsCounter.model.js";

function parseKVPayload(payload) {
  const result = {};
  String(payload || "")
    .split(",")
    .forEach((part) => {
      const p = part.trim();
      if (!p || !p.includes("=")) return;
      const idx = p.indexOf("=");
      const key = p.slice(0, idx).trim();
      const value = p.slice(idx + 1).trim();
      result[key] = value;
    });
  return result;
}

function toCounter(value) {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/* Date helpers for day/month rollover detection */
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function extractSmsCounters(payload) {
  const kv = parseKVPayload(payload);
  const smsToday = toCounter(kv.smsToday);
  const smsMonth = toCounter(kv.smsMonth);

  if (smsToday === null || smsMonth === null) {
    return { ok: false, reason: "invalid_counter" };
  }

  return {
    ok: true,
    data: {
      smsToday,
      smsMonth,
    },
  };
}

export async function listSmsCounters() {
  const rows = await SmsCounter.find({}).sort({ device: 1 }).lean();
  return { ok: true, data: rows };
}

export async function getSmsCounter(device) {
  const row = await SmsCounter.findOne({ device }).lean();
  if (!row) return { ok: false, status: 404, message: "Counter not found" };
  return { ok: true, data: row };
}

/**
 * Authoritative delta-based upsert.
 *
 * The server is the source of truth for SMS counters. The ESP32 maintains
 * its own volatile counters that reset on reboot. This function:
 *  1. Computes the DELTA between the incoming device value and the last
 *     raw value we received from that device.
 *  2. Adds the delta to the server-authoritative total.
 *  3. Handles day/month rollovers via date checks.
 *
 * Returns the authoritative counter values (not the device's raw values).
 */
export async function upsertSmsCounter(device, counters) {
  if (!device) return { ok: false, status: 400, message: "Device is required" };

  const incomingToday = toCounter(counters?.smsToday);
  const incomingMonth = toCounter(counters?.smsMonth);
  if (incomingToday === null || incomingMonth === null) {
    return { ok: false, status: 400, message: "Invalid SMS counter values" };
  }

  const existing = await SmsCounter.findOne({ device }).lean();

  if (!existing) {
    // First entry for this device — use incoming values as the baseline
    const now = new Date();
    const doc = await SmsCounter.create({
      device,
      smsToday: incomingToday,
      smsMonth: incomingMonth,
      lastDeviceToday: incomingToday,
      lastDeviceMonth: incomingMonth,
      lastDailyReset: todayStr(),
      lastMonthlyReset: monthStr(),
    });
    return { ok: true, data: doc.toObject() };
  }

  /* ── Day / month rollover detection ── */
  const curDay = todayStr();
  const curMonth = monthStr();
  let serverToday = existing.smsToday;
  let serverMonth = existing.smsMonth;
  let lastDevToday = existing.lastDeviceToday ?? 0;
  let lastDevMonth = existing.lastDeviceMonth ?? 0;
  let dailyReset = existing.lastDailyReset || "";
  let monthlyReset = existing.lastMonthlyReset || "";

  /* If reset-date fields were never written (legacy records or missing fields),
     backfill them to today without resetting counters. This prevents a false
     "month changed" / "day changed" detection on every server restart. */
  if (!dailyReset) dailyReset = curDay;
  if (!monthlyReset) monthlyReset = curMonth;

  const dayChanged = curDay !== dailyReset;
  const monthChanged = curMonth !== monthlyReset;

  if (monthChanged) {
    // New month → reset both counters, re-baseline device values
    serverMonth = 0;
    serverToday = 0;
    lastDevToday = 0;
    lastDevMonth = 0;
    dailyReset = curDay;
    monthlyReset = curMonth;
  } else if (dayChanged) {
    // New day within the same month → reset daily counter only
    serverToday = 0;
    lastDevToday = 0;
    dailyReset = curDay;
  }

  /* ── Compute deltas ── */
  let todayDelta = 0;
  let monthDelta = 0;

  if (incomingToday >= lastDevToday) {
    // Normal increment (or no change)
    todayDelta = incomingToday - lastDevToday;
  } else {
    // Device counter dropped → device restarted.
    // The incoming value IS the number of SMS sent since restart.
    todayDelta = incomingToday;
  }

  if (incomingMonth >= lastDevMonth) {
    monthDelta = incomingMonth - lastDevMonth;
  } else {
    monthDelta = incomingMonth;
  }

  serverToday += todayDelta;
  serverMonth += monthDelta;

  const updated = await SmsCounter.findOneAndUpdate(
    { device },
    {
      $set: {
        smsToday: serverToday,
        smsMonth: serverMonth,
        lastDeviceToday: incomingToday,
        lastDeviceMonth: incomingMonth,
        lastDailyReset: dailyReset,
        lastMonthlyReset: monthlyReset,
      },
    },
    { new: true }
  ).lean();

  return { ok: true, data: updated };
}

export async function deleteSmsCounter(device) {
  const deleted = await SmsCounter.findOneAndDelete({ device }).lean();
  if (!deleted) return { ok: false, status: 404, message: "Counter not found" };
  return { ok: true, data: deleted };
}

export async function upsertSmsCounterFromTelemetry(device, payload) {
  const parsed = extractSmsCounters(payload);
  if (!parsed.ok) return { ok: false, ignored: true, reason: parsed.reason };
  return upsertSmsCounter(device, parsed.data);
}

export function toGsmPayloadWithCounters(counterDoc) {
  if (!counterDoc) return null;
  const today = Number.isFinite(counterDoc.smsToday) ? counterDoc.smsToday : 0;
  const month = Number.isFinite(counterDoc.smsMonth) ? counterDoc.smsMonth : 0;
  return `smsToday=${today},smsMonth=${month}`;
}

/**
 * Patch a raw GSM payload string: replace the device's smsToday/smsMonth
 * values with the server-authoritative values from the given counter doc.
 */
export function patchPayloadWithAuthCounters(payload, counterDoc) {
  if (!counterDoc) return payload;
  const authToday = Number.isFinite(counterDoc.smsToday)
    ? counterDoc.smsToday
    : 0;
  const authMonth = Number.isFinite(counterDoc.smsMonth)
    ? counterDoc.smsMonth
    : 0;
  let patched = String(payload || "");
  patched = patched.replace(/smsToday=\d+/, `smsToday=${authToday}`);
  patched = patched.replace(/smsMonth=\d+/, `smsMonth=${authMonth}`);
  return patched;
}
