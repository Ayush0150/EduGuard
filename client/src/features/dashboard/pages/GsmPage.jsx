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
    if (i >= filled) return "bg-surface-200 dark:bg-surface-700";
    if (pct >= 60) return "bg-emerald-500";
    if (pct >= 30) return "bg-amber-500";
    return "bg-red-500";
  };
  const heights =
    size === "lg"
      ? ["h-3", "h-5", "h-7", "h-9", "h-11"]
      : ["h-2", "h-3", "h-4", "h-5", "h-6"];
  const w = size === "lg" ? "w-2" : "w-[5px]";
  return (
    <div className="flex items-end gap-[3px]">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`${w} rounded-sm transition-all duration-500 ${h} ${barColor(i)}`}
        />
      ))}
    </div>
  );
}

/* ── Live Pulse Dot ── */
function LivePulse({ active }) {
  if (!active) return null;
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
    </span>
  );
}

/* ── Stat card with change flash ── */
function StatCard({ icon: Icon, label, value, sub, accent, flash }) {
  const empty =
    value === undefined || value === "" || value === "—" || value === null;
  return (
    <div
      className={`group flex items-start gap-3 rounded-xl border p-4 transition-all duration-500 hover:shadow-md ${
        flash
          ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700/50 dark:bg-emerald-900/10"
          : "border-surface-100 bg-white dark:border-surface-800 dark:bg-surface-900"
      }`}
    >
      {Icon && (
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent || "bg-surface-100 dark:bg-surface-800"}`}
        >
          <Icon
            size={18}
            className={
              accent ? "text-white" : "text-surface-500 dark:text-surface-400"
            }
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
          {label}
        </p>
        <p
          className={`mt-0.5 truncate text-lg font-extrabold leading-tight transition-colors duration-300 ${
            empty
              ? "text-surface-300 dark:text-surface-600"
              : "text-surface-900 dark:text-surface-50"
          }`}
        >
          {empty ? "—" : value}
        </p>
        {sub && (
          <p className="mt-0.5 text-[11px] font-semibold text-surface-400">
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
      className={`flex items-center justify-between gap-4 rounded-lg border px-4 py-2.5 transition-all duration-500 ${
        changed
          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/40 dark:bg-emerald-900/20"
          : "border-surface-100 bg-surface-50/50 dark:border-surface-800 dark:bg-surface-900/50"
      }`}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider text-surface-400">
        {label}
      </span>
      <span
        className={`text-sm font-semibold transition-colors duration-300 ${
          changed
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-surface-700 dark:text-surface-300"
        } ${mono ? "font-mono tabular-nums" : ""}`}
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

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(flashTimerRef.current);
      clearTimeout(changedTimerRef.current);
    };
  }, []);

  // Detect gsm changes via setTimeout (avoids sync setState-in-effect lint)
  useEffect(() => {
    if (!gsm) return;
    // setTimeout makes the setState calls asynchronous relative to the effect
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

  // Live "time ago" counter + staleness flag
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

  /* isLive: WS connected AND device actually sending data AND GSM data is fresh */
  const isLive =
    wsStatus === "connected" && telemetryFresh && !isStale && !!lastUpdated;

  const parseCounter = (value) => {
    const n = Number.parseInt(String(value ?? "").trim(), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const smsToday = parseCounter(d.smsToday);
  const smsMonth = parseCounter(d.smsMonth);

  const operator = safeGsmValue(d.operator, "Unknown Carrier");
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
      ? "bg-surface-300"
      : batPct > 50
        ? "bg-emerald-500"
        : batPct > 20
          ? "bg-amber-500"
          : "bg-red-500";

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
      ? "text-surface-400"
      : signalPct >= 60
        ? "text-emerald-600 dark:text-emerald-400"
        : signalPct >= 30
          ? "text-amber-600 dark:text-amber-400"
          : "text-red-600 dark:text-red-400";

  const simPalette = {
    emerald:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    amber:
      "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    red: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    surface:
      "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400",
  }[sim.color];

  return (
    <AnimatedPage>
      {/* ── Breadcrumb + Title ── */}
      <div>
        <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-surface-400">
          <Link
            to="/dashboard"
            className="transition-colors hover:text-brand-500"
          >
            Dashboard
          </Link>
          <ChevronRight size={12} />
          <span className="text-surface-600 dark:text-surface-300">
            Cellular Network
          </span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-surface-900 dark:text-white">
              Cellular Network
            </h1>
            <p className="mt-1 text-sm font-medium text-surface-500">
              SIM800L GSM modem — live telemetry every 10 seconds
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* SIM badge */}
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${simPalette}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${sim.color === "emerald" ? "bg-emerald-500" : "bg-red-500"}`}
              />
              {sim.label}
            </span>
            {/* Live / Stale / Offline badge */}
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${
                isLive
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800"
                  : isStale
                    ? "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800"
                    : "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800"
              }`}
            >
              <LivePulse active={isLive} />
              {!isLive && (
                <span
                  className={`h-2 w-2 rounded-full ${isStale ? "bg-amber-500" : "bg-red-500"}`}
                />
              )}
              {isLive ? "Live" : isStale ? "Stale" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Real-Time Status Bar ── */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-all duration-500 ${
          isFlashing
            ? "border-emerald-300 bg-emerald-50 shadow-sm shadow-emerald-100 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:shadow-emerald-900/20"
            : "border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity
              size={14}
              className={`transition-colors duration-300 ${
                isFlashing
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-surface-400"
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-surface-500">
              Telemetry Stream
            </span>
          </div>
          <div className="hidden h-4 w-px bg-surface-200 dark:bg-surface-700 sm:block" />
          <div className="flex items-center gap-1.5">
            <Clock size={12} className="text-surface-400" />
            <span
              className={`text-xs font-semibold tabular-nums ${
                isStale
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-surface-600 dark:text-surface-300"
              }`}
            >
              {lastUpdated ? timeAgo : "Awaiting data…"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <RefreshCw
              size={12}
              className={`text-surface-400 ${isFlashing ? "animate-spin" : ""}`}
            />
            <span className="text-xs font-semibold tabular-nums text-surface-500">
              {updateCount} updates
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {wsStatus === "connected" ? (
              <Wifi size={12} className="text-emerald-500" />
            ) : (
              <WifiOff size={12} className="text-red-500" />
            )}
            <span
              className={`text-xs font-bold uppercase ${
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
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-surface-200 bg-white py-24 dark:border-surface-800 dark:bg-surface-900">
          <Signal
            className="animate-pulse text-surface-300 dark:text-surface-600"
            size={40}
          />
          <p className="text-sm font-medium text-surface-400">
            Connecting to cell tower…
          </p>
          <p className="text-xs text-surface-400">
            GSM telemetry arrives every 10 seconds via WebSocket
          </p>
        </div>
      ) : (
        <>
          {/* ── Hero Card: Carrier + Signal ── */}
          <div
            className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-all duration-700 sm:p-8 ${
              ready
                ? "bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700"
                : "bg-gradient-to-br from-surface-500 via-surface-600 to-surface-700"
            }`}
          >
            {/* decorative orbs */}
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
            <div className="absolute -bottom-16 -right-4 h-40 w-40 rounded-full bg-white/5" />
            <div className="absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full bg-white/5" />

            {/* live flash ring */}
            {isFlashing && (
              <div className="animate-pulse absolute inset-0 rounded-2xl ring-2 ring-inset ring-white/30" />
            )}

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                      Active Carrier
                    </p>
                    {isLive && (
                      <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
                        <LivePulse active />
                        <span className="ml-0.5">Live</span>
                      </span>
                    )}
                  </div>
                  <h2
                    className={`mt-1 text-3xl font-black leading-tight transition-all duration-500 sm:text-4xl ${
                      changedKeys.has("operator") ? "scale-[1.02]" : ""
                    }`}
                  >
                    {operator}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {network && (
                    <span
                      className={`rounded-lg bg-white/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-sm transition-all duration-500 ${
                        changedKeys.has("net") ? "ring-1 ring-white/40" : ""
                      }`}
                    >
                      {network}
                    </span>
                  )}
                  <span
                    className={`rounded-lg px-3 py-1 text-[11px] font-bold ${reg.ok ? "bg-white/15" : "bg-red-500/30"}`}
                  >
                    {reg.roaming ? "🌐 Roaming" : reg.ok ? "✓ Home" : reg.label}
                  </span>
                  <span
                    className={`rounded-lg bg-white/15 px-3 py-1 text-[11px] font-bold transition-all duration-500 ${!ready ? "bg-red-500/30" : ""}`}
                  >
                    {ready ? "● Modem Online" : "○ Modem Offline"}
                  </span>
                </div>
                {/* Last updated inside hero */}
                <div className="flex items-center gap-1.5 text-[10px] font-medium opacity-50">
                  <Clock size={10} />
                  <span className="tabular-nums">
                    {lastUpdated
                      ? `Updated ${timeAgo}`
                      : "Waiting for telemetry…"}
                  </span>
                </div>
              </div>

              <div
                className={`flex flex-col items-center gap-2 rounded-xl bg-white/10 px-6 py-4 backdrop-blur-sm transition-all duration-500 ${
                  changedKeys.has("signal")
                    ? "scale-[1.03] ring-2 ring-white/30"
                    : ""
                }`}
              >
                <SignalBars pct={signalPct} size="lg" />
                <p
                  className={`text-sm font-bold ${signalPct >= 60 ? "text-emerald-200" : signalPct >= 30 ? "text-amber-200" : "text-red-200"}`}
                >
                  {signalLabel}
                </p>
                <p className="text-3xl font-black leading-none tabular-nums">
                  {signalPct !== null ? `${signalPct}%` : "—"}
                </p>
                <p className="text-[10px] font-medium opacity-60">
                  {signalVal !== null ? `CSQ: ${signalVal}/31` : "No reading"}
                </p>
              </div>
            </div>
          </div>

          {/* ── Stats Grid ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Signal}
              label="Signal Strength"
              value={signalPct !== null ? `${signalPct}%` : undefined}
              accent="bg-emerald-500"
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
              accent={reg.ok ? "bg-blue-500" : "bg-red-500"}
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
              accent="bg-violet-500"
              flash={changedKeys.has("smsToday")}
              sub="Auto-reset at 11:59 PM"
            />
            <StatCard
              icon={Mail}
              label="SMS This Month"
              value={String(smsMonth)}
              accent="bg-indigo-500"
              flash={changedKeys.has("smsMonth")}
              sub="Successful sends only"
            />
          </div>

          {/* ── Battery + Signal Detail (side by side) ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Battery Card */}
            <div
              className={`rounded-2xl border bg-white p-6 shadow-soft transition-all duration-500 dark:bg-surface-900 ${
                changedKeys.has("battery")
                  ? "border-amber-300 dark:border-amber-700/50"
                  : "border-surface-200 dark:border-surface-800"
              }`}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500">
                    <Zap size={17} className="text-white" />
                  </div>
                  <h3 className="text-base font-bold text-surface-800 dark:text-white">
                    Modem Battery
                  </h3>
                </div>
                {changedKeys.has("battery") && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    Updated
                  </span>
                )}
              </div>

              <div className="mb-3 flex items-end justify-between">
                <div>
                  <p className="text-4xl font-black tabular-nums text-surface-900 dark:text-white">
                    {batPct !== null ? `${batPct}%` : "—"}
                  </p>
                  {batVolt && (
                    <p className="mt-1 text-sm font-semibold text-surface-400">
                      {batVolt}V
                    </p>
                  )}
                </div>
                <div className="relative h-20 w-10 overflow-hidden rounded-lg border-2 border-surface-300 dark:border-surface-600">
                  <div className="absolute left-1/2 top-[-2px] h-1.5 w-4 -translate-x-1/2 rounded-t bg-surface-300 dark:bg-surface-600" />
                  <div
                    className={`absolute bottom-0 w-full transition-all duration-700 ${batColor}`}
                    style={{ height: batPct !== null ? `${batPct}%` : "0%" }}
                  />
                </div>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${batColor}`}
                  style={{ width: batPct !== null ? `${batPct}%` : "0%" }}
                />
              </div>

              {batPct !== null && batPct <= 20 && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-900/20">
                  <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">
                    Low battery — charge modem soon
                  </span>
                </div>
              )}
            </div>

            {/* Signal Quality Card */}
            <div
              className={`rounded-2xl border bg-white p-6 shadow-soft transition-all duration-500 dark:bg-surface-900 ${
                changedKeys.has("signal")
                  ? "border-emerald-300 dark:border-emerald-700/50"
                  : "border-surface-200 dark:border-surface-800"
              }`}
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500">
                    <Signal size={17} className="text-white" />
                  </div>
                  <h3 className="text-base font-bold text-surface-800 dark:text-white">
                    Signal Quality
                  </h3>
                </div>
                {changedKeys.has("signal") && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                    Updated
                  </span>
                )}
              </div>

              {/* Signal gauge */}
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                    Signal Level
                  </span>
                  <span className={`text-sm font-bold ${signalColor}`}>
                    {signalLabel}
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                  <div className="absolute inset-0 flex">
                    <div
                      className="h-full bg-red-300/50"
                      style={{ width: "20%" }}
                    />
                    <div
                      className="h-full bg-amber-300/50"
                      style={{ width: "20%" }}
                    />
                    <div
                      className="h-full bg-emerald-300/50"
                      style={{ width: "60%" }}
                    />
                  </div>
                  {signalPct !== null && (
                    <div
                      className={`absolute top-0 h-full w-1 rounded-full shadow-lg transition-all duration-700 ${signalPct >= 60 ? "bg-emerald-500" : signalPct >= 30 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ left: `${Math.min(97, signalPct)}%` }}
                    />
                  )}
                </div>
                <div className="mt-1 flex justify-between text-[9px] font-bold uppercase tracking-wider text-surface-400">
                  <span>Poor</span>
                  <span>Fair</span>
                  <span>Excellent</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-3 dark:border-surface-800 dark:bg-surface-800/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                    Raw CSQ
                  </p>
                  <p className="text-lg font-black tabular-nums text-surface-800 dark:text-white">
                    {signalVal !== null ? signalVal : "—"}
                    <span className="text-xs font-semibold text-surface-400">
                      /31
                    </span>
                  </p>
                </div>
                <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-3 dark:border-surface-800 dark:bg-surface-800/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                    Percentage
                  </p>
                  <p className="text-lg font-black tabular-nums text-surface-800 dark:text-white">
                    {signalPct !== null ? `${signalPct}%` : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Network Details ── */}
          <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-soft dark:border-surface-800 dark:bg-surface-900">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500">
                  <Radio size={17} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-surface-800 dark:text-white">
                  Network Details
                </h3>
              </div>
              {lastUpdated && (
                <span className="text-[10px] font-semibold tabular-nums text-surface-400">
                  {timeAgo}
                </span>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
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
            <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-soft dark:border-surface-800 dark:bg-surface-900">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-600">
                  <Smartphone size={17} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-surface-800 dark:text-white">
                  Device Identifiers
                </h3>
              </div>

              <div className="space-y-2">
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
          <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-soft dark:border-surface-800 dark:bg-surface-900">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500">
                  <MessageSquare size={17} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-surface-800 dark:text-white">
                  SMS Analytics
                </h3>
              </div>
              {(changedKeys.has("smsToday") || changedKeys.has("smsMonth")) && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                  Updated
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div
                className={`relative overflow-hidden rounded-xl border p-5 transition-all duration-500 ${
                  changedKeys.has("smsToday")
                    ? "border-violet-400 bg-gradient-to-br from-violet-100 to-violet-50 dark:border-violet-600/50 dark:from-violet-900/30 dark:to-violet-900/15"
                    : "border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:border-violet-800/50 dark:from-violet-900/20 dark:to-violet-900/10"
                }`}
              >
                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-violet-200/30 dark:bg-violet-700/20" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500">
                  Today
                </p>
                <p className="mt-2 text-4xl font-black tabular-nums text-violet-700 dark:text-violet-300">
                  {smsToday}
                </p>
                <p className="mt-1 text-xs font-medium text-violet-500/80">
                  Auto-reset at 11:59 PM
                </p>
              </div>

              <div
                className={`relative overflow-hidden rounded-xl border p-5 transition-all duration-500 ${
                  changedKeys.has("smsMonth")
                    ? "border-indigo-400 bg-gradient-to-br from-indigo-100 to-indigo-50 dark:border-indigo-600/50 dark:from-indigo-900/30 dark:to-indigo-900/15"
                    : "border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:border-indigo-800/50 dark:from-indigo-900/20 dark:to-indigo-900/10"
                }`}
              >
                <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-indigo-200/30 dark:bg-indigo-700/20" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">
                  This Month
                </p>
                <p className="mt-2 text-4xl font-black tabular-nums text-indigo-700 dark:text-indigo-300">
                  {smsMonth}
                </p>
                <p className="mt-1 text-xs font-medium text-indigo-500/80">
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
