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

export async function upsertSmsCounter(device, counters) {
  if (!device) return { ok: false, status: 400, message: "Device is required" };

  const smsToday = toCounter(counters?.smsToday);
  const smsMonth = toCounter(counters?.smsMonth);
  if (smsToday === null || smsMonth === null) {
    return { ok: false, status: 400, message: "Invalid SMS counter values" };
  }

  const existing = await SmsCounter.findOne({ device }).lean();

  if (existing) {
    const todayDropped = smsToday < existing.smsToday;
    const monthDropped = smsMonth < existing.smsMonth;
    const validReset = smsToday === 0 || smsMonth === 0;

    if ((todayDropped || monthDropped) && !validReset) {
      return {
        ok: false,
        status: 409,
        message: "Rejected stale/invalid counter update",
      };
    }
  }

  const updated = await SmsCounter.findOneAndUpdate(
    { device },
    { $set: { smsToday, smsMonth } },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
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
  return `gsmReady=false,smsToday=${today},smsMonth=${month}`;
}
