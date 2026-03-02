/**
 * WifiPage – WiFi & ESP32 System Health Dashboard
 * ------------------------------------------------
 * Premium, comprehensive view of WiFi connectivity and ESP32 hardware.
 */

import {
  ArrowUpCircle,
  ChevronRight,
  Clock,
  Cpu,
  Database,
  Gauge,
  MemoryStick,
  Router,
  Smartphone,
  Thermometer,
  Wifi,
} from "lucide-react";
import { useMemo } from "react";
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

function formatUptime(secs) {
  if (!secs || isNaN(secs)) return "—";
  const s = Number(secs);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function rssiToPercent(rssi) {
  const r = Number(rssi);
  if (isNaN(r)) return null;
  if (r >= -50) return 100;
  if (r <= -100) return 0;
  return Math.round(2 * (r + 100));
}

function rssiLabel(rssi) {
  const p = rssiToPercent(rssi);
  if (p === null) return "No Signal";
  if (p >= 70) return "Excellent";
  if (p >= 40) return "Good";
  if (p >= 20) return "Fair";
  return "Poor";
}

function resetReasonLabel(code) {
  const c = Number(code);
  switch (c) {
    case 1:
      return "Power On";
    case 3:
      return "Software Reset";
    case 4:
      return "Legacy WDT";
    case 5:
      return "Deep Sleep";
    case 6:
      return "SLC Reset";
    case 7:
      return "Timer Group0 WDT";
    case 8:
      return "Timer Group1 WDT";
    case 9:
      return "RTC WDT";
    case 10:
      return "Intrusion Test";
    case 11:
      return "Timer Group WDT CPU";
    case 12:
      return "Software CPU Reset";
    case 13:
      return "RTC WDT CPU";
    case 14:
      return "Brownout";
    case 15:
      return "RTC Normal";
    default:
      return code ? `Code ${code}` : "Unknown";
  }
}

/* ── Stat card ── */
function StatCard({
  icon: Icon,
  label,
  value,
  unit = "",
  sub,
  accent,
  warning,
}) {
  const empty = value === undefined || value === "" || value === null;
  return (
    <div className="group flex items-start gap-3 rounded-xl border border-surface-100 bg-white p-4 transition-all hover:shadow-md dark:border-surface-800 dark:bg-surface-900">
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
          className={`mt-0.5 truncate text-lg font-extrabold leading-tight ${empty ? "text-surface-300 dark:text-surface-600" : "text-surface-900 dark:text-surface-50"}`}
        >
          {empty ? "—" : `${value}${unit}`}
        </p>
        {sub && (
          <p
            className={`mt-0.5 text-[11px] font-semibold ${warning ? "text-red-500" : "text-surface-400"}`}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-surface-100 bg-surface-50/50 px-4 py-2.5 dark:border-surface-800 dark:bg-surface-900/50">
      <span className="text-[11px] font-bold uppercase tracking-wider text-surface-400">
        {label}
      </span>
      <span
        className={`text-sm font-semibold text-surface-700 dark:text-surface-300 ${mono ? "font-mono tabular-nums" : ""}`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

/* ── WiFi strength ring ── */
function SignalRing({ percent }) {
  const p = percent ?? 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (p / 100) * circumference;
  const color =
    p >= 70
      ? "stroke-emerald-500"
      : p >= 40
        ? "stroke-amber-500"
        : "stroke-red-500";
  const bgColor =
    p >= 70
      ? "text-emerald-600 dark:text-emerald-400"
      : p >= 40
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="relative flex items-center justify-center">
      <svg width="130" height="130" className="-rotate-90">
        <circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          strokeWidth="8"
          className="stroke-surface-200 dark:stroke-surface-700"
        />
        <circle
          cx="65"
          cy="65"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${color} transition-all duration-1000`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-2xl font-black ${bgColor}`}>{p}%</span>
        <span className="text-[10px] font-bold text-surface-400">Quality</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */

export default function WifiPage() {
  const { wifi, esp, device } = useTelemetry();
  const w = useMemo(() => parseToObject(wifi), [wifi]);
  const e = useMemo(() => parseToObject(esp), [esp]);
  const dev = useMemo(() => parseToObject(device), [device]);
  const empty = Object.keys(w).length === 0 && Object.keys(e).length === 0;

  const rssi = w.rssi;
  const rssiPct = rssiToPercent(rssi);
  const heapKB = e.heap ? Math.round(Number(e.heap) / 1024) : null;
  const minHeapKB = e.minHeap ? Math.round(Number(e.minHeap) / 1024) : null;
  const heapPct = e.heap ? Math.round((Number(e.heap) / 327680) * 100) : null; // ~320KB total typical
  const temp = e.temp ? Number(e.temp) : null;
  const uptime = e.uptime || w.uptime;

  /* Uptime derived directly from telemetry (ESP sends every ~1s) */
  const liveUptime = useMemo(() => {
    const s = Number(uptime);
    return !isNaN(s) && s > 0 ? s : 0;
  }, [uptime]);

  return (
    <AnimatedPage>
      {/* ── Breadcrumb + Title ── */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-surface-400 mb-3">
          <Link
            to="/dashboard"
            className="hover:text-brand-500 transition-colors"
          >
            Dashboard
          </Link>
          <ChevronRight size={12} />
          <span className="text-surface-600 dark:text-surface-300">
            WiFi & System
          </span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-surface-900 dark:text-white">
              WiFi & System Health
            </h1>
            <p className="mt-1 text-sm font-medium text-surface-500">
              ESP32 connectivity, hardware diagnostics & performance metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${
                rssiPct !== null
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800"
                  : "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${rssiPct !== null ? "bg-emerald-500" : "bg-red-500"}`}
              />
              {rssiPct !== null ? "WiFi Connected" : "WiFi Offline"}
            </span>
          </div>
        </div>
      </div>

      {empty ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-surface-200 bg-white py-24 dark:border-surface-800 dark:bg-surface-900">
          <Cpu
            className="animate-pulse text-surface-300 dark:text-surface-600"
            size={40}
          />
          <p className="text-sm font-medium text-surface-400">
            Fetching diagnostics…
          </p>
          <p className="text-xs text-surface-400">
            ESP health updates every second, WiFi every 15 seconds
          </p>
        </div>
      ) : (
        <>
          {/* ── Hero: WiFi Signal + Uptime ── */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white shadow-lg sm:p-8">
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
            <div className="absolute -right-4 -bottom-16 h-40 w-40 rounded-full bg-white/5" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                    WiFi Network
                  </p>
                  <h2 className="mt-1 text-3xl font-black leading-tight sm:text-4xl">
                    {w.ssid || "Not Connected"}
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-white/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider backdrop-blur-sm">
                    Channel {w.channel || "—"}
                  </span>
                  <span className="rounded-lg bg-white/15 px-3 py-1 text-[11px] font-bold">
                    {rssi ? `${rssi} dBm` : "No Signal"}
                  </span>
                  <span className="rounded-lg bg-white/15 px-3 py-1 text-[11px] font-bold">
                    {rssiLabel(rssi)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm font-medium opacity-80">
                  <span className="flex items-center gap-1.5">
                    <Router size={14} /> {w.ip || "—"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} /> {formatUptime(liveUptime)}
                  </span>
                </div>
              </div>

              <SignalRing percent={rssiPct} />
            </div>
          </div>

          {/* ── WiFi Stats Grid ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Wifi}
              label="Signal Strength"
              value={rssiPct !== null ? `${rssiPct}%` : undefined}
              accent="bg-blue-500"
              sub={rssi ? `${rssi} dBm · ${rssiLabel(rssi)}` : "No signal"}
            />
            <StatCard
              icon={Router}
              label="IP Address"
              value={w.ip}
              accent="bg-indigo-500"
              sub={w.ssid ? `Network: ${w.ssid}` : undefined}
            />
            <StatCard
              icon={ArrowUpCircle}
              label="Reconnects"
              value={w.reconnects}
              accent="bg-amber-500"
              sub={
                Number(w.reconnects) > 5
                  ? "⚠ High reconnect count"
                  : "Connection is stable"
              }
              warning={Number(w.reconnects) > 5}
            />
            <StatCard
              icon={Clock}
              label="Uptime"
              value={formatUptime(liveUptime)}
              accent="bg-emerald-500"
              sub="Since last boot"
            />
          </div>

          {/* ── WiFi Details Card ── */}
          <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-soft dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500">
                <Wifi size={17} className="text-white" />
              </div>
              <h3 className="text-base font-bold text-surface-800 dark:text-white">
                Connection Details
              </h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <InfoRow label="SSID" value={w.ssid} />
              <InfoRow label="Channel" value={w.channel} />
              <InfoRow label="IP Address" value={w.ip} mono />
              <InfoRow
                label="RSSI"
                value={rssi ? `${rssi} dBm` : undefined}
                mono
              />
              <InfoRow
                label="Signal Quality"
                value={rssiPct !== null ? `${rssiPct}%` : undefined}
              />
              <InfoRow label="MAC (BSSID)" value={w.mac} mono />
              <InfoRow label="Reconnect Count" value={w.reconnects} />
              <InfoRow label="WiFi Uptime" value={formatUptime(w.uptime)} />
            </div>
          </div>

          {/* ── ESP32 Hardware Section ── */}
          <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-soft dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500">
                  <Cpu size={17} className="text-white" />
                </div>
                <h3 className="text-base font-bold text-surface-800 dark:text-white">
                  ESP32 Hardware
                </h3>
              </div>
              {dev.firmware && (
                <span className="rounded-full bg-surface-100 px-3 py-1.5 text-[10px] font-bold text-surface-500 dark:bg-surface-800">
                  FW {dev.firmware}
                </span>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Memory */}
              <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-4 dark:border-surface-800 dark:bg-surface-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <MemoryStick size={15} className="text-emerald-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                    Free Heap
                  </p>
                </div>
                <p className="text-2xl font-black text-surface-800 dark:text-white tabular-nums">
                  {heapKB !== null ? `${heapKB}` : "—"}
                  <span className="text-sm font-semibold text-surface-400">
                    {" "}
                    KB
                  </span>
                </p>
                {heapPct !== null && (
                  <div className="mt-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${heapPct > 50 ? "bg-emerald-500" : heapPct > 25 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${heapPct}%` }}
                      />
                    </div>
                  </div>
                )}
                {minHeapKB !== null && (
                  <p className="mt-1.5 text-[10px] font-semibold text-surface-400">
                    Min: {minHeapKB} KB
                  </p>
                )}
              </div>

              {/* Temperature */}
              <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-4 dark:border-surface-800 dark:bg-surface-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <Thermometer
                    size={15}
                    className={
                      temp > 70
                        ? "text-red-500"
                        : temp > 50
                          ? "text-amber-500"
                          : "text-blue-500"
                    }
                  />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                    Core Temp
                  </p>
                </div>
                <p className="text-2xl font-black text-surface-800 dark:text-white tabular-nums">
                  {temp !== null ? temp.toFixed(1) : "—"}
                  <span className="text-sm font-semibold text-surface-400">
                    °C
                  </span>
                </p>
                <p
                  className={`mt-1.5 text-[10px] font-bold ${temp > 70 ? "text-red-500" : temp > 50 ? "text-amber-500" : "text-emerald-500"}`}
                >
                  {temp > 70
                    ? "⚠ High Temperature"
                    : temp > 50
                      ? "Warm"
                      : "Normal"}
                </p>
              </div>

              {/* CPU */}
              <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-4 dark:border-surface-800 dark:bg-surface-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <Gauge size={15} className="text-brand-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                    CPU Speed
                  </p>
                </div>
                <p className="text-2xl font-black text-surface-800 dark:text-white tabular-nums">
                  {e.cpuMHz || "—"}
                  <span className="text-sm font-semibold text-surface-400">
                    {" "}
                    MHz
                  </span>
                </p>
                <p className="mt-1.5 text-[10px] font-semibold text-surface-400">
                  {e.cores || "—"} cores
                </p>
              </div>

              {/* Flash */}
              <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-4 dark:border-surface-800 dark:bg-surface-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <Database size={15} className="text-slate-500" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                    Flash Storage
                  </p>
                </div>
                <p className="text-2xl font-black text-surface-800 dark:text-white tabular-nums">
                  {e.flashKB ? Math.round(Number(e.flashKB) / 1024) : "—"}
                  <span className="text-sm font-semibold text-surface-400">
                    {" "}
                    MB
                  </span>
                </p>
                <p className="mt-1.5 text-[10px] font-semibold text-surface-400">
                  Reset: {resetReasonLabel(e.resetReason)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Device Info ── */}
          <div className="rounded-2xl border border-surface-200 bg-white p-6 shadow-soft dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-center gap-2 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-600">
                <Smartphone size={17} className="text-white" />
              </div>
              <h3 className="text-base font-bold text-surface-800 dark:text-white">
                Device Information
              </h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <InfoRow label="Firmware" value={dev.firmware} />
              <InfoRow label="Chip Model" value={dev.chip} />
              <InfoRow label="Revision" value={dev.rev} />
              <InfoRow label="Cores" value={dev.cores || e.cores} />
              <InfoRow label="SDK Version" value={dev.sdk} />
              <InfoRow label="MAC Address" value={dev.mac || w.mac} mono />
              <InfoRow
                label="Flash"
                value={
                  dev.flashMB
                    ? `${dev.flashMB} MB`
                    : e.flashKB
                      ? `${Math.round(Number(e.flashKB) / 1024)} MB`
                      : undefined
                }
              />
              <InfoRow
                label="Reset Reason"
                value={resetReasonLabel(e.resetReason)}
              />
            </div>
          </div>
        </>
      )}
    </AnimatedPage>
  );
}
