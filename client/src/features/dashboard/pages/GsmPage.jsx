/**
 * GsmPage – Real-Time Cellular Network Dashboard
 * ------------------------------------------------
 * Live GSM/SIM800L telemetry with real-time update indicators,
 * pulse animations on data changes, and "last updated" timer.
 */

import {
  Activity,
  ChevronRight,
  Clock,
  Globe,
  Mail,
  MessageSquare,
  Radio,
  RefreshCw,
  Signal,
  Smartphone,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AnimatedPage from "../../../core/components/AnimatedPage";
import { useTelemetry } from "../context/TelemetryContext";

/* ── Helpers ── */
function parseToObject(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed || trimmed.startsWith("Waiting")) return {};
  const obj = {};
  let lastKey = null;
  trimmed.split(",").forEach((part) => {
    const p = part.trim();
    if (!p) return;
    if (p.includes("=")) {
      const i = p.indexOf("=");
      let k = p.slice(0, i).trim();
      if (k.includes(":")) k = k.split(":")[1];
      lastKey = k;
      obj[lastKey] = p.slice(i + 1).trim();
    } else if (p.includes(":")) {
      const i = p.indexOf(":");
      lastKey = p.slice(0, i).trim();
      obj[lastKey] = p.slice(i + 1).trim();
    } else if (lastKey) {
      obj[lastKey] += `, ${p}`;
    }
  });
  return obj;
}

function isInvalidGsmValue(value) {
  const v = String(value || "").trim();
  if (!v) return true;
  const upper = v.toUpperCase();
  return (
    upper === "N/A" ||
    upper === "NA" ||
    upper === "ERROR" ||
    upper.includes("CME ERROR") ||
    upper.includes("CMS ERROR")
  );
}

function safeGsmValue(value, fallback = "—") {
  return isInvalidGsmValue(value) ? fallback : String(value).trim();
}

function normalizeCarrierName(name) {
  const value = String(name || "").trim();
  if (/^air\s*tel$/i.test(value)) return "Airtel";
  return value;
}

function parseRegistration(raw) {
  if (!raw || raw === "—")
    return { label: "Unknown", ok: false, roaming: false };
  const parts = String(raw).split(",");
  const stat = Number.parseInt(parts[parts.length - 1].trim(), 10);
  switch (stat) {
    case 0:
      return { label: "Not Registered", ok: false, roaming: false };
    case 1:
      return { label: "Home Network", ok: true, roaming: false };
    case 2:
      return { label: "Searching…", ok: false, roaming: false };
    case 3:
      return { label: "Denied", ok: false, roaming: false };
    case 5:
      return { label: "Roaming", ok: true, roaming: true };
    default:
      return { label: "Unknown", ok: false, roaming: false };
  }
}

function parseSimStatus(raw) {
  const s = String(raw || "")
    .trim()
    .toUpperCase();
  if (s === "READY") return { label: "SIM Ready", color: "emerald" };
  if (s === "SIM PIN") return { label: "PIN Required", color: "amber" };
  if (s === "SIM PUK") return { label: "PUK Required", color: "red" };
  if (s === "NOT INSERTED") return { label: "No SIM", color: "red" };
  if (s === "NOT READY") return { label: "Not Ready", color: "red" };
  if (s === "ERROR") return { label: "SIM Error", color: "red" };
  if (s.length > 0) return { label: s, color: "surface" };
  return { label: "Unknown", color: "surface" };
}

function formatTimeAgo(ts) {
  if (!ts) return "Never";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 2) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s ago`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
}

/* ── Signal bars ── */
function SignalBars({ pct, size = "md" }) {
  const filled = pct === null ? 0 : Math.round((pct / 100) * 5);
  const barColor = (i) => {
    if (i >= filled) return "bg-white/20 dark:bg-white/10";
    if (pct >= 60) return "bg-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]";
    if (pct >= 30) return "bg-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]";
    return "bg-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]";
  };
  const heights =
    size === "lg"
      ? ["h-3.5", "h-5", "h-7", "h-9", "h-11"]
      : ["h-2.5", "h-3.5", "h-5", "h-6", "h-7"];
  const w = size === "lg" ? "w-2.5" : "w-1.5";
  return (
    <div className="flex items-end gap-[4px]">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`${w} rounded-full transition-all duration-500 ${h} ${barColor(i)}`}
        />
      ))}
    </div>
  );
}

/* ── Live Pulse Dot ── */
function LivePulse({ active }) {
  if (!active) return null;
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
    </span>
  );
}

/* ── Stat card with change flash ── */
function StatCard({ icon: Icon, label, value, sub, accent, flash }) {
  const empty =
    value === undefined || value === "" || value === "—" || value === null;
  return (
    <div
      className={`group relative flex items-start gap-4 rounded-2xl p-5 transition-all duration-500 ring-1 ring-inset ${
        flash
          ? "bg-emerald-50/80 ring-emerald-500/40 shadow-[0_8px_30px_rgba(16,185,129,0.15)] -translate-y-0.5 dark:bg-emerald-500/10 dark:ring-emerald-400/40"
          : "bg-white/80 ring-surface-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:bg-surface-900/60 dark:ring-surface-700/50 dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
      } backdrop-blur-xl`}
    >
      {Icon && (
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-inner ring-1 ring-inset ring-white/20 transition-transform duration-300 group-hover:scale-105 ${
            accent || "bg-gradient-to-br from-surface-100 to-surface-200 dark:from-surface-700 dark:to-surface-800"
          }`}
        >
          <Icon
            size={20}
            className={
              accent ? "text-white drop-shadow-sm" : "text-surface-500 dark:text-surface-400"
            }
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
          {label}
        </p>
        <p
          className={`mt-1 truncate text-2xl font-black tabular-nums tracking-tight leading-none transition-colors duration-300 ${
            empty
              ? "text-surface-300 dark:text-surface-600"
              : flash
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-surface-900 dark:text-white"
          }`}
        >
          {empty ? "—" : value}
        </p>
        {sub && (
          <p className="mt-1.5 text-[11px] font-medium text-surface-500 dark:text-surface-400">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono = false, changed = false }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3 transition-all duration-500 ring-1 ring-inset ${
        changed
          ? "bg-emerald-50/80 ring-emerald-500/30 dark:bg-emerald-500/10 dark:ring-emerald-400/30"
          : "bg-surface-50/50 ring-surface-200/50 hover:bg-surface-100/50 dark:bg-surface-800/30 dark:ring-surface-700/50 dark:hover:bg-surface-800/50"
      }`}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
        {label}
      </span>
      <span
        className={`text-[13px] font-bold transition-colors duration-300 ${
          changed
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-surface-900 dark:text-surface-100"
        } ${mono ? "font-mono tracking-widest" : ""}`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */

export default function GsmPage() {
  const { gsm, wsStatus, telemetryFresh } = useTelemetry();
  const d = useMemo(() => parseToObject(gsm), [gsm]);
  const empty = Object.keys(d).length === 0;
  const ready = d.gsmReady === "true";

  /* ── Real-time tracking ── */
  const [lastUpdated, setLastUpdated] = useState(null);
  const [timeAgo, setTimeAgo] = useState("Never");
  const [updateCount, setUpdateCount] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [changedKeys, setChangedKeys] = useState(new Set());
  const prevDataRef = useRef({});
  const prevGsmRef = useRef("");
  const flashTimerRef = useRef(null);
  const changedTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(flashTimerRef.current);
      clearTimeout(changedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!gsm) return;
    const id = setTimeout(() => {
      if (gsm === prevGsmRef.current) return;
      prevGsmRef.current = gsm;

      setLastUpdated(Date.now());
      setUpdateCount((c) => c + 1);
      setIsFlashing(true);

      const newData = parseToObject(gsm);
      const prev = prevDataRef.current;
      const changed = new Set();
      for (const key of Object.keys(newData)) {
        if (prev[key] !== newData[key]) changed.add(key);
      }
      setChangedKeys(changed);
      prevDataRef.current = newData;

      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setIsFlashing(false), 1200);
      clearTimeout(changedTimerRef.current);
      changedTimerRef.current = setTimeout(
        () => setChangedKeys(new Set()),
        2500
      );
    }, 0);
    return () => clearTimeout(id);
  }, [gsm]);

  const [isStale, setIsStale] = useState(false);
  useEffect(() => {
    if (!lastUpdated) return;
    const tick = () => {
      setTimeAgo(formatTimeAgo(lastUpdated));
      setIsStale(Date.now() - lastUpdated > 35000);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  const isLive =
    wsStatus === "connected" && telemetryFresh && !isStale && !!lastUpdated;

  const parseCounter = (value) => {
    const n = Number.parseInt(String(value ?? "").trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const smsToday = parseCounter(d.smsToday);
  const smsMonth = parseCounter(d.smsMonth);

  const operator = normalizeCarrierName(
    safeGsmValue(d.operator, "Unknown Carrier")
  );
  const network = safeGsmValue(d.net, null);
  const imei = safeGsmValue(d.imei, null);
  const iccid = safeGsmValue(d.iccid, null);
  const reg = parseRegistration(safeGsmValue(d.reg, ""));
  const sim = parseSimStatus(safeGsmValue(d.sim, ready ? "READY" : ""));

  /* Battery */
  let batPct = null,
    batVolt = null;
  const rawBat = safeGsmValue(d.battery, "");
  if (rawBat.includes(",")) {
    const parts = rawBat.split(",");
    const p = Number.parseInt(parts[1]?.trim() || "", 10);
    const mv = Number.parseInt(parts[2]?.trim() || "", 10);
    if (Number.isFinite(p) && p >= 0 && p <= 100) batPct = p;
    if (Number.isFinite(mv) && mv > 0) batVolt = (mv / 1000).toFixed(1);
  }
  const batColor =
    batPct === null
      ? "bg-surface-300 dark:bg-surface-600"
      : batPct > 50
        ? "bg-gradient-to-t from-emerald-500 to-emerald-400"
        : batPct > 20
          ? "bg-gradient-to-t from-amber-500 to-amber-400"
          : "bg-gradient-to-t from-red-500 to-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]";

  /* Signal */
  const parsedSignal = Number.parseInt(safeGsmValue(d.signal, ""), 10);
  const signalVal = Number.isFinite(parsedSignal)
    ? Math.max(0, Math.min(parsedSignal, 31))
    : null;
  const signalPct =
    signalVal !== null
      ? Math.min(100, Math.round((signalVal / 31) * 100))
      : null;
  const signalLabel =
    signalPct === null
      ? "No Signal"
      : signalPct >= 70
        ? "Excellent"
        : signalPct >= 40
          ? "Good"
          : signalPct >= 20
            ? "Fair"
            : "Poor";
  const signalColor =
    signalPct === null
      ? "text-surface-400 dark:text-surface-500"
      : signalPct >= 60
        ? "text-emerald-600 dark:text-emerald-400"
        : signalPct >= 30
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400";

  const simPalette = {
    emerald:
      "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-900/30",
    amber:
      "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-900/30",
    red: "bg-red-50 text-red-700 ring-red-200/60 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-900/30",
    surface:
      "bg-surface-100 text-surface-600 ring-surface-200/60 dark:bg-surface-800 dark:text-surface-400 dark:ring-surface-700/50",
  }[sim.color];

  return (
    <AnimatedPage className="pb-16 max-w-6xl mx-auto space-y-8">
      {/* ── Breadcrumb + Title ── */}
      <div className="border-b border-surface-200/60 pb-6 dark:border-surface-800/60">
        <div className="mb-4 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-surface-400">
          <Link
            to="/dashboard"
            className="transition-colors hover:text-brand-500"
          >
            Dashboard
          </Link>
          <ChevronRight size={14} strokeWidth={3} />
          <span className="text-surface-700 dark:text-surface-200">
            Cellular Network
          </span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-surface-900 dark:text-white">
              Cellular Network
            </h1>
            <p className="mt-2 text-[15px] font-medium text-surface-500 dark:text-surface-400">
              SIM800L GSM modem — live telemetry every 10 seconds.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* SIM badge */}
            <span
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset ${simPalette}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${sim.color === "emerald" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"}`}
              />
              {sim.label}
            </span>
            {/* Live / Stale / Offline badge */}
            <span
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset ${
                isLive
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-900/30"
                  : isStale
                    ? "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-900/30"
                    : "bg-red-50 text-red-700 ring-red-200/60 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-900/30"
              }`}
            >
              <LivePulse active={isLive} />
              {!isLive && (
                <span
                  className={`h-2 w-2 rounded-full ${isStale ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"}`}
                />
              )}
              {isLive ? "Connection Live" : isStale ? "Data Stale" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Real-Time Status Bar ── */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4 transition-all duration-500 ring-1 ring-inset backdrop-blur-xl ${
          isFlashing
            ? "bg-emerald-50/90 ring-emerald-500/40 shadow-[0_8px_30px_rgba(16,185,129,0.15)] dark:bg-emerald-500/10 dark:ring-emerald-400/40"
            : "bg-white/80 ring-surface-200/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:bg-surface-900/60 dark:ring-surface-700/50"
        }`}
      >
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <Activity
              size={16}
              className={`transition-colors duration-300 ${
                isFlashing
                  ? "text-emerald-600 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)] dark:text-emerald-400"
                  : "text-surface-400"
              }`}
              strokeWidth={2.5}
            />
            <span className="text-[12px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
              Telemetry Stream
            </span>
          </div>
          <div className="hidden h-5 w-px bg-surface-200 dark:bg-surface-700 sm:block" />
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-surface-400" />
            <span
              className={`text-[13px] font-bold tabular-nums tracking-wide ${
                isStale
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-surface-700 dark:text-surface-200"
              }`}
            >
              {lastUpdated ? timeAgo : "Awaiting data…"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <RefreshCw
              size={14}
              className={`text-surface-400 ${isFlashing ? "animate-spin text-emerald-500" : ""}`}
              strokeWidth={2.5}
            />
            <span className="text-[13px] font-bold tabular-nums text-surface-600 dark:text-surface-300">
              {updateCount} updates
            </span>
          </div>
          <div className="hidden h-5 w-px bg-surface-200 dark:bg-surface-700 sm:block" />
          <div className="flex items-center gap-2">
            {wsStatus === "connected" ? (
              <Wifi size={14} className="text-emerald-500 drop-shadow-sm" strokeWidth={2.5} />
            ) : (
              <WifiOff size={14} className="text-red-500 drop-shadow-sm" strokeWidth={2.5} />
            )}
            <span
              className={`text-[12px] font-bold uppercase tracking-wider ${
                wsStatus === "connected"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {wsStatus === "connected"
                ? "Connected"
                : wsStatus === "connecting"
                  ? "Connecting…"
                  : "Disconnected"}
            </span>
          </div>
        </div>
      </div>

      {empty ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-surface-200/60 bg-white/50 py-32 backdrop-blur-xl dark:border-surface-800/60 dark:bg-surface-900/50">
          <div className="rounded-full bg-surface-100 p-5 dark:bg-surface-800">
            <Signal
              className="animate-pulse text-surface-400 dark:text-surface-500"
              size={48}
              strokeWidth={1.5}
            />
          </div>
          <p className="text-lg font-bold text-surface-900 dark:text-white">
            Connecting to cell tower…
          </p>
          <p className="text-[13px] font-medium text-surface-500 dark:text-surface-400">
            GSM telemetry arrives every 10 seconds via WebSocket.
          </p>
        </div>
      ) : (
        <>
          {/* ── Hero Card: Carrier + Signal ── */}
          <div
            className={`relative overflow-hidden rounded-3xl p-8 text-white shadow-[0_16px_40px_rgba(0,0,0,0.12)] transition-all duration-700 sm:p-10 ${
              ready
                ? "bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-700"
                : "bg-gradient-to-br from-surface-600 via-surface-700 to-surface-800"
            }`}
          >
            {/* Decorative orbs */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-black/10 blur-2xl" />
            <div className="absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-white/5 blur-xl" />

            {/* Live flash ring */}
            {isFlashing && (
              <div className="animate-pulse absolute inset-0 rounded-3xl ring-2 ring-inset ring-white/40" />
            )}

            <div className="relative flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <p className="text-[11px] font-black uppercase tracking-widest text-white/70">
                      Active Carrier
                    </p>
                    {isLive && (
                      <span className="flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-md shadow-sm">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                        </span>
                        <span>Live</span>
                      </span>
                    )}
                  </div>
                  <h2
                    className={`mt-2 text-4xl font-black tracking-tight leading-none transition-all duration-500 sm:text-5xl ${
                      changedKeys.has("operator") ? "scale-[1.02] drop-shadow-lg" : "drop-shadow-sm"
                    }`}
                  >
                    {operator}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {network && (
                    <span
                      className={`rounded-xl bg-white/20 px-4 py-1.5 text-[12px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm transition-all duration-500 ${
                        changedKeys.has("net") ? "ring-2 ring-white/60 bg-white/30" : ""
                      }`}
                    >
                      {network}
                    </span>
                  )}
                  <span
                    className={`rounded-xl px-4 py-1.5 text-[12px] font-bold shadow-sm backdrop-blur-md ${reg.ok ? "bg-white/20" : "bg-red-500/40 ring-1 ring-red-400/50"}`}
                  >
                    {reg.roaming ? "🌐 Roaming Active" : reg.ok ? "✓ Home Network" : reg.label}
                  </span>
                  <span
                    className={`rounded-xl bg-white/20 px-4 py-1.5 text-[12px] font-bold shadow-sm backdrop-blur-md transition-all duration-500 ${!ready ? "bg-red-500/40 ring-1 ring-red-400/50" : ""}`}
                  >
                    {ready ? "● Modem Online" : "○ Modem Offline"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-white/60 uppercase mt-4">
                  <Clock size={12} />
                  <span className="tabular-nums">
                    {lastUpdated
                      ? `Last updated ${timeAgo}`
                      : "Waiting for telemetry stream…"}
                  </span>
                </div>
              </div>

              <div
                className={`flex flex-col items-center gap-3 rounded-2xl bg-black/20 px-8 py-6 backdrop-blur-md shadow-inner transition-all duration-500 ${
                  changedKeys.has("signal")
                    ? "scale-[1.03] ring-2 ring-white/40 bg-black/30"
                    : "ring-1 ring-white/10"
                }`}
              >
                <SignalBars pct={signalPct} size="lg" />
                <p
                  className={`text-[15px] font-black tracking-wide ${signalPct >= 60 ? "text-emerald-300" : signalPct >= 30 ? "text-amber-300" : "text-red-300"}`}
                >
                  {signalLabel}
                </p>
                <p className="text-4xl font-black leading-none tabular-nums drop-shadow-md">
                  {signalPct !== null ? `${signalPct}%` : "—"}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">
                  {signalVal !== null ? `CSQ ${signalVal}/31` : "No reading"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Signal}
              label="Signal Strength"
              value={signalPct !== null ? `${signalPct}%` : undefined}
              accent="bg-gradient-to-br from-emerald-400 to-emerald-600"
              flash={changedKeys.has("signal")}
              sub={
                signalVal !== null
                  ? `CSQ ${signalVal}/31 · ${signalLabel}`
                  : "No reading"
              }
            />
            <StatCard
              icon={Globe}
              label="Registration"
              value={reg.label}
              accent={reg.ok ? "bg-gradient-to-br from-blue-400 to-blue-600" : "bg-gradient-to-br from-red-400 to-red-600"}
              flash={changedKeys.has("reg")}
              sub={
                reg.roaming
                  ? "International roaming active"
                  : reg.ok
                    ? "Registered to home network"
                    : "Check SIM/antenna"
              }
            />
            <StatCard
              icon={MessageSquare}
              label="SMS Sent Today"
              value={String(smsToday)}
              accent="bg-gradient-to-br from-violet-400 to-violet-600"
              flash={changedKeys.has("smsToday")}
              sub="Auto-reset at 11:59 PM"
            />
            <StatCard
              icon={Mail}
              label="SMS This Month"
              value={String(smsMonth)}
              accent="bg-gradient-to-br from-indigo-400 to-indigo-600"
              flash={changedKeys.has("smsMonth")}
              sub="Successful sends only"
            />
          </div>

          {/* ── Battery + Signal Detail (side by side) ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Battery Card */}
            <div
              className={`rounded-3xl bg-white/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl ring-1 ring-inset transition-all duration-500 dark:bg-surface-900/60 ${
                changedKeys.has("battery")
                  ? "ring-amber-500/40 bg-amber-50/30 dark:ring-amber-400/30 dark:bg-amber-500/5"
                  : "ring-surface-200/60 dark:ring-surface-700/50"
              }`}
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-inner ring-1 ring-inset ring-white/20">
                    <Zap size={20} className="text-white drop-shadow-sm" />
                  </div>
                  <h3 className="text-[16px] font-bold tracking-tight text-surface-900 dark:text-white">
                    Modem Battery
                  </h3>
                </div>
                {changedKeys.has("battery") && (
                  <span className="rounded-lg bg-amber-100/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                    Updated
                  </span>
                )}
              </div>

              <div className="mb-6 flex items-end justify-between">
                <div>
                  <p className="text-5xl font-black tabular-nums tracking-tight text-surface-900 dark:text-white">
                    {batPct !== null ? `${batPct}%` : "—"}
                  </p>
                  {batVolt && (
                    <p className="mt-2 text-[14px] font-bold text-surface-500 dark:text-surface-400">
                      Voltage: <span className="text-surface-900 dark:text-surface-200">{batVolt}V</span>
                    </p>
                  )}
                </div>
                {/* Vertical Battery Icon */}
                <div className="relative h-24 w-11 rounded-xl border-2 border-surface-200 bg-surface-50 shadow-inner dark:border-surface-700 dark:bg-surface-800">
                  <div className="absolute left-1/2 top-[-4px] h-1.5 w-5 -translate-x-1/2 rounded-t-md bg-surface-200 dark:bg-surface-700" />
                  <div className="absolute inset-x-0.5 bottom-0.5 top-0.5 overflow-hidden rounded-[8px]">
                    <div
                      className={`absolute bottom-0 w-full transition-all duration-700 ${batColor}`}
                      style={{ height: batPct !== null ? `${batPct}%` : "0%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Horizontal Bar */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-surface-100 shadow-inner dark:bg-surface-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${batColor}`}
                  style={{ width: batPct !== null ? `${batPct}%` : "0%" }}
                />
              </div>

              {batPct !== null && batPct <= 20 && (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-red-200/60 bg-red-50/80 px-4 py-3 dark:border-red-900/30 dark:bg-red-500/10">
                  <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  <span className="text-[13px] font-bold text-red-700 dark:text-red-400">
                    Critical battery level — module may power off.
                  </span>
                </div>
              )}
            </div>

            {/* Signal Quality Card */}
            <div
              className={`rounded-3xl bg-white/80 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl ring-1 ring-inset transition-all duration-500 dark:bg-surface-900/60 ${
                changedKeys.has("signal")
                  ? "ring-emerald-500/40 bg-emerald-50/30 dark:ring-emerald-400/30 dark:bg-emerald-500/5"
                  : "ring-surface-200/60 dark:ring-surface-700/50"
              }`}
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-inner ring-1 ring-inset ring-white/20">
                    <Signal size={20} className="text-white drop-shadow-sm" />
                  </div>
                  <h3 className="text-[16px] font-bold tracking-tight text-surface-900 dark:text-white">
                    Signal Quality
                  </h3>
                </div>
                {changedKeys.has("signal") && (
                  <span className="rounded-lg bg-emerald-100/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                    Updated
                  </span>
                )}
              </div>

              {/* Signal gauge */}
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                    Signal Level
                  </span>
                  <span className={`text-[14px] font-black tracking-wide ${signalColor}`}>
                    {signalLabel}
                  </span>
                </div>
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-surface-100 shadow-inner dark:bg-surface-800">
                  <div className="absolute inset-0 flex">
                    <div
                      className="h-full bg-red-400/30 dark:bg-red-500/20"
                      style={{ width: "20%" }}
                    />
                    <div
                      className="h-full bg-amber-400/30 dark:bg-amber-500/20"
                      style={{ width: "20%" }}
                    />
                    <div
                      className="h-full bg-emerald-400/30 dark:bg-emerald-500/20"
                      style={{ width: "60%" }}
                    />
                  </div>
                  {signalPct !== null && (
                    <div
                      className={`absolute top-0 h-full w-2 rounded-full shadow-md transition-all duration-700 ${signalPct >= 60 ? "bg-emerald-500" : signalPct >= 30 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ left: `${Math.min(97, signalPct)}%` }}
                    />
                  )}
                </div>
                <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-widest text-surface-400">
                  <span>Poor</span>
                  <span>Fair</span>
                  <span>Excellent</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-surface-50/80 p-4 ring-1 ring-inset ring-surface-200/50 dark:bg-surface-800/50 dark:ring-surface-700/50">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                    Raw CSQ
                  </p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-surface-900 dark:text-white">
                    {signalVal !== null ? signalVal : "—"}
                    <span className="text-[14px] font-bold text-surface-400 dark:text-surface-500">
                      /31
                    </span>
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-50/80 p-4 ring-1 ring-inset ring-surface-200/50 dark:bg-surface-800/50 dark:ring-surface-700/50">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
                    Percentage
                  </p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-surface-900 dark:text-white">
                    {signalPct !== null ? `${signalPct}%` : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Network Details ── */}
          <div className="rounded-3xl bg-white/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl ring-1 ring-inset ring-surface-200/60 dark:bg-surface-900/60 dark:ring-surface-700/50">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-inner ring-1 ring-inset ring-white/20">
                  <Radio size={20} className="text-white drop-shadow-sm" />
                </div>
                <h3 className="text-[16px] font-bold tracking-tight text-surface-900 dark:text-white">
                  Network Details
                </h3>
              </div>
              {lastUpdated && (
                <span className="text-[11px] font-bold uppercase tracking-wider tabular-nums text-surface-400">
                  {timeAgo}
                </span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow
                label="Operator"
                value={operator}
                changed={changedKeys.has("operator")}
              />
              <InfoRow
                label="Network Type"
                value={network || "—"}
                changed={changedKeys.has("net")}
              />
              <InfoRow
                label="Registration"
                value={reg.label}
                changed={changedKeys.has("reg")}
              />
              <InfoRow
                label="SIM Status"
                value={sim.label}
                changed={changedKeys.has("sim")}
              />
              <InfoRow
                label="GSM Modem"
                value={ready ? "Online" : "Offline"}
                changed={changedKeys.has("gsmReady")}
              />
              <InfoRow
                label="Modem Battery"
                value={
                  batPct !== null
                    ? `${batPct}% ${batVolt ? `(${batVolt}V)` : ""}`
                    : "—"
                }
                changed={changedKeys.has("battery")}
              />
            </div>
          </div>

          {/* ── Device Identifiers ── */}
          {(imei || iccid) && (
            <div className="rounded-3xl bg-white/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl ring-1 ring-inset ring-surface-200/60 dark:bg-surface-900/60 dark:ring-surface-700/50">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 shadow-inner ring-1 ring-inset ring-white/20">
                  <Smartphone size={20} className="text-white drop-shadow-sm" />
                </div>
                <h3 className="text-[16px] font-bold tracking-tight text-surface-900 dark:text-white">
                  Device Identifiers
                </h3>
              </div>

              <div className="space-y-3">
                {imei && (
                  <InfoRow
                    label="IMEI"
                    value={imei.replace(
                      /(\d{2})(\d{6})(\d{6})(\d{1})/,
                      "$1-$2-$3-$4"
                    )}
                    mono
                    changed={changedKeys.has("imei")}
                  />
                )}
                {iccid && (
                  <InfoRow
                    label="ICCID"
                    value={iccid.replace(
                      /(\d{4})(\d{7})(\d{4})(\d+)/,
                      "$1 $2 $3 $4"
                    )}
                    mono
                    changed={changedKeys.has("iccid")}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── SMS Analytics ── */}
          <div className="rounded-3xl bg-white/80 p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl ring-1 ring-inset ring-surface-200/60 dark:bg-surface-900/60 dark:ring-surface-700/50">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-inner ring-1 ring-inset ring-white/20">
                  <MessageSquare size={20} className="text-white drop-shadow-sm" />
                </div>
                <h3 className="text-[16px] font-bold tracking-tight text-surface-900 dark:text-white">
                  SMS Analytics
                </h3>
              </div>
              {(changedKeys.has("smsToday") || changedKeys.has("smsMonth")) && (
                <span className="rounded-lg bg-violet-100/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700 dark:bg-violet-500/20 dark:text-violet-400">
                  Updated
                </span>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div
                className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-500 ring-1 ring-inset ${
                  changedKeys.has("smsToday")
                    ? "bg-gradient-to-br from-violet-100 to-violet-50 ring-violet-400 dark:from-violet-900/40 dark:to-violet-900/20 dark:ring-violet-500/50"
                    : "bg-gradient-to-br from-violet-50 to-violet-100/50 ring-violet-200/80 dark:from-violet-900/20 dark:to-violet-900/10 dark:ring-violet-800/50"
                }`}
              >
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-violet-200/40 blur-xl dark:bg-violet-700/20" />
                <p className="text-[11px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">
                  Today
                </p>
                <p className="mt-3 text-5xl font-black tabular-nums tracking-tight text-violet-900 dark:text-violet-200 drop-shadow-sm">
                  {smsToday}
                </p>
                <p className="mt-2 text-[12px] font-bold text-violet-600/70 dark:text-violet-400/70">
                  Auto-resets at 11:59 PM
                </p>
              </div>

              <div
                className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-500 ring-1 ring-inset ${
                  changedKeys.has("smsMonth")
                    ? "bg-gradient-to-br from-indigo-100 to-indigo-50 ring-indigo-400 dark:from-indigo-900/40 dark:to-indigo-900/20 dark:ring-indigo-500/50"
                    : "bg-gradient-to-br from-indigo-50 to-indigo-100/50 ring-indigo-200/80 dark:from-indigo-900/20 dark:to-indigo-900/10 dark:ring-indigo-800/50"
                }`}
              >
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-indigo-200/40 blur-xl dark:bg-indigo-700/20" />
                <p className="text-[11px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  This Month
                </p>
                <p className="mt-3 text-5xl font-black tabular-nums tracking-tight text-indigo-900 dark:text-indigo-200 drop-shadow-sm">
                  {smsMonth}
                </p>
                <p className="mt-2 text-[12px] font-bold text-indigo-600/70 dark:text-indigo-400/70">
                  Successful sends only
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </AnimatedPage>
  );
}
