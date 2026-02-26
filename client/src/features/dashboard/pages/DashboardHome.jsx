import {
  Activity,
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Droplets,
  Gauge,
  MemoryStick,
  Radio,
  Router,
  ShieldAlert,
  Signal,
  Smartphone,
  Thermometer,
  Timer,
  Users,
  Wifi,
  WifiOff,
  Wind,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ================================================================
   EduGuard Dashboard – Redesigned Professional Edition
   ================================================================ */

const STORAGE_KEY = "eduguard_telemetry";
const RECONNECT_BASE = 1000;
const RECONNECT_MAX = 16000;

/* ── Parser ── */
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
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
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
  if (p === null) return "";
  if (p >= 70) return "Excellent";
  if (p >= 40) return "Good";
  if (p >= 20) return "Fair";
  return "Poor";
}

function parseClockToSeconds(clockText) {
  const match = String(clockText || "").match(
    /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/
  );
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = Number(match[3]);
  if (h > 23 || m > 59 || s > 59) return null;
  return h * 3600 + m * 60 + s;
}

function formatClockFromSeconds(totalSeconds) {
  const secondsInDay = 24 * 60 * 60;
  const safe =
    ((Number(totalSeconds) % secondsInDay) + secondsInDay) % secondsInDay;
  const h = Math.floor(safe / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((safe % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(safe % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function shouldAcceptArduinoPayload(currentPayload, nextPayload) {
  const current = parseToObject(currentPayload);
  const next = parseToObject(nextPayload);

  const currentPeriod = Number(current.P);
  const nextPeriod = Number(next.P);
  const currentPT = Number(current.PT);
  const nextPT = Number(next.PT);

  if (
    Number.isNaN(currentPeriod) ||
    Number.isNaN(nextPeriod) ||
    Number.isNaN(currentPT) ||
    Number.isNaN(nextPT)
  ) {
    return true;
  }

  if (nextPeriod === currentPeriod && nextPT + 2 < currentPT) {
    return false;
  }

  return true;
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

function hasValidGsmData(payload) {
  const d = parseToObject(payload);
  if (Object.keys(d).length === 0) return false;
  if (d.gsmReady === "true") return true;

  const keys = [
    "signal",
    "operator",
    "battery",
    "reg",
    "imei",
    "iccid",
    "sim",
    "net",
  ];
  return keys.some((k) => !isInvalidGsmValue(d[k]));
}

/* ── Reusable Components ── */

function StatusDot({ connected }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"}`}
    />
  );
}

function AlertCard({ active, icon: Icon, label, description, color = "red" }) {
  const isTrue = active === "true" || active === "1" || active === true;
  if (!isTrue) return null;

  const palettes = {
    red: "from-red-500/10 to-red-600/5 border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-400",
    amber:
      "from-amber-500/10 to-amber-600/5 border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400",
    blue: "from-blue-500/10 to-blue-600/5 border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-400",
    violet:
      "from-violet-500/10 to-violet-600/5 border-violet-200 dark:border-violet-800/60 text-violet-700 dark:text-violet-400",
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-xl border bg-gradient-to-br p-4 animate-pulse ${palettes[color]}`}
    >
      <Icon size={20} strokeWidth={2.5} className="mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-bold leading-tight">{label}</p>
        <p className="mt-0.5 text-xs opacity-70">{description}</p>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, unit = "", sub, accent }) {
  const empty = value === undefined || value === "" || value === "N/A";
  const display = empty ? "—" : `${value}${unit}`;

  return (
    <div className="group relative flex items-start gap-3 rounded-xl border border-surface-100 bg-white p-4 transition-all hover:shadow-md dark:border-surface-800 dark:bg-surface-900">
      {Icon && (
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent || "bg-surface-100 dark:bg-surface-800"}`}
        >
          <Icon
            size={18}
            className={`${accent ? "text-white" : "text-surface-500 dark:text-surface-400"}`}
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
          {display}
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

function SectionHeader({ icon: Icon, title, badge, children }) {
  return (
    <div className="flex items-center justify-between pb-3">
      <h3 className="flex items-center gap-2 text-sm font-bold text-surface-800 dark:text-surface-100">
        {Icon && <Icon size={16} className="text-brand-500" />}
        {title}
        {badge && (
          <span className="ml-1 rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
            {badge}
          </span>
        )}
      </h3>
      {children}
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
        className={`text-sm font-semibold text-surface-700 dark:text-surface-300 ${mono ? "font-mono" : ""}`}
      >
        {value || "—"}
      </span>
    </div>
  );
}

function ProgressBar({ percent, color = "bg-brand-500" }) {
  const clamped = Math.max(0, Math.min(100, percent ?? 0));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function WaitingState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-surface-400 dark:text-surface-500">
      <Icon className="animate-pulse" size={28} />
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   WASHROOM AIR-QUALITY CARD
   ═══════════════════════════════════════════════════════════════ */
function WashroomAirCard({ gasValue, dirtyActive }) {
  const gs = Number(gasValue) || 0;
  const SCALE = 3000;
  const isAlert = gs > 2000;
  const isElevated = gs > 1400 && !isAlert;
  const pct = Math.min(97, (gs / SCALE) * 100);

  const status = isAlert ? "Alert" : isElevated ? "Elevated" : "Clean";
  const c = isAlert
    ? {
        border: "border-red-200 dark:border-red-800",
        bg: "bg-red-50/70 dark:bg-red-900/20",
        iconBg: "bg-red-100 dark:bg-red-900/40",
        icon: "text-red-500",
        label: "text-red-600 dark:text-red-400",
        needle: "bg-red-500",
      }
    : isElevated
      ? {
          border: "border-amber-200 dark:border-amber-800",
          bg: "bg-amber-50/70 dark:bg-amber-900/20",
          iconBg: "bg-amber-100 dark:bg-amber-900/40",
          icon: "text-amber-500",
          label: "text-amber-600 dark:text-amber-400",
          needle: "bg-amber-500",
        }
      : {
          border: "border-emerald-200 dark:border-emerald-800",
          bg: "bg-emerald-50/60 dark:bg-emerald-900/10",
          iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
          icon: "text-emerald-500",
          label: "text-emerald-600 dark:text-emerald-400",
          needle: "bg-emerald-500",
        };

  return (
    <div
      className={`col-span-2 rounded-xl border ${c.border} ${c.bg} p-4 transition-all`}
    >
      {/* ── Top row: icon + status label + raw reading ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.iconBg}`}
          >
            <Droplets size={20} className={c.icon} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
              Washroom Air Quality
            </p>
            <p className={`text-base font-extrabold leading-tight ${c.label}`}>
              {status}
            </p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl font-black tabular-nums text-surface-800 dark:text-white">
            {gs > 0 ? gs.toLocaleString() : "—"}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
            ppm
          </p>
        </div>
      </div>

      {/* ── Zone bar ── */}
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-surface-400">
          <span>0</span>
          <span className="text-emerald-500">Clean ≤1400</span>
          <span className="text-amber-500">Elevated ≤2000</span>
          <span className="text-red-500">{"Alert >2000"}</span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-full">
          {/* Colour zone bands */}
          <div className="absolute inset-0 flex">
            <div
              className="h-full bg-emerald-300/70 dark:bg-emerald-700/50"
              style={{ width: "46.7%" }}
            />
            <div
              className="h-full bg-amber-300/70 dark:bg-amber-700/50"
              style={{ width: "20%" }}
            />
            <div
              className="h-full bg-red-300/70 dark:bg-red-700/50"
              style={{ width: "33.3%" }}
            />
          </div>
          {/* Needle showing current reading */}
          {gs > 0 && (
            <div
              className={`absolute top-0 h-full w-[3px] rounded-full ${c.needle} shadow transition-all duration-700`}
              style={{ left: `${pct}%` }}
            />
          )}
        </div>
      </div>

      {/* ── Active alert pill ── */}
      {dirtyActive && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-100 dark:bg-red-900/30 px-3 py-2">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-500" />
          <span className="text-xs font-bold text-red-600 dark:text-red-400">
            Cleaning staff notified via SMS
          </span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 1 — Classroom Live View (Arduino telemetry)
   ═══════════════════════════════════════════════════════════════ */

function ClassroomPanel({ dataString }) {
  const d = useMemo(() => parseToObject(dataString), [dataString]);
  const empty = Object.keys(d).length === 0;

  const [nowTick, setNowTick] = useState(Date.now());
  const [clockAnchor, setClockAnchor] = useState({
    baseSec: null,
    startedAt: Date.now(),
  });
  const [periodAnchor, setPeriodAnchor] = useState({
    baseSec: 0,
    startedAt: Date.now(),
  });

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const baseSec = parseClockToSeconds(d.T);
    if (baseSec !== null) {
      setClockAnchor({ baseSec, startedAt: Date.now() });
    }
  }, [d.T]);

  useEffect(() => {
    const baseSec = Number(d.PT);
    if (!Number.isNaN(baseSec)) {
      setPeriodAnchor({ baseSec, startedAt: Date.now() });
    }
  }, [d.PT, d.P]);

  const liveClock = useMemo(() => {
    if (clockAnchor.baseSec === null) return d.T || "";
    const elapsed = Math.floor((nowTick - clockAnchor.startedAt) / 1000);
    return formatClockFromSeconds(clockAnchor.baseSec + elapsed);
  }, [clockAnchor, d.T, nowTick]);

  const livePeriodSec = useMemo(() => {
    const elapsed = Math.floor((nowTick - periodAnchor.startedAt) / 1000);
    return Math.max(0, periodAnchor.baseSec + elapsed);
  }, [periodAnchor, nowTick]);

  const graceSec = 10;
  const periodSec = livePeriodSec;
  const periodNum = d.P || "—";
  const graceActive = periodSec < graceSec;
  const gracePercent = graceActive
    ? Math.round((periodSec / graceSec) * 100)
    : 100;

  const present = d.isPresent === "true";
  const absent = d.isTeacherAbsent === "true";
  const systemOn = d.isSystemActive === "true";

  return (
    <div className="rounded-2xl border border-surface-200 bg-white shadow-soft overflow-hidden dark:border-surface-800 dark:bg-surface-900">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 px-6 py-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
        <div className="absolute -right-2 -bottom-10 h-24 w-24 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-200">
              Live Classroom
            </p>
            <h2 className="mt-1 flex items-baseline gap-3 text-2xl font-black text-white">
              Room {d.class || "706"}
              <span className="text-sm font-bold text-brand-200/80">
                Period {periodNum}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* System status pill */}
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
                systemOn
                  ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30"
                  : "bg-red-500/20 text-red-200 ring-1 ring-red-400/30"
              }`}
            >
              <StatusDot connected={systemOn} />
              {systemOn ? "System Online" : "System Offline"}
            </span>

            {/* Clock */}
            {liveClock && (
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/90 ring-1 ring-white/10">
                <Clock size={13} /> {liveClock}
              </span>
            )}
          </div>
        </div>
      </div>

      {empty ? (
        <WaitingState icon={Activity} text="Awaiting sensor stream…" />
      ) : (
        <div className="p-6 space-y-6">
          {/* ── Active Alerts Banner ── */}
          {(d.isEmergencyReq === "true" ||
            d.isACReq === "true" ||
            d.isWashroomDirty === "true" ||
            absent) && (
            <div className="grid gap-3 sm:grid-cols-2">
              <AlertCard
                active={d.isEmergencyReq}
                icon={ShieldAlert}
                label="EMERGENCY ACTIVE"
                description="Emergency alarm triggered — admin notified via call & SMS"
                color="red"
              />
              <AlertCard
                active={d.isACReq}
                icon={Wind}
                label="AC REQUESTED"
                description="Air conditioning request sent to maintenance"
                color="blue"
              />
              <AlertCard
                active={d.isWashroomDirty}
                icon={Droplets}
                label="WASHROOM ALERT"
                description="Gas sensor triggered — cleaning staff notified"
                color="amber"
              />
              <AlertCard
                active={absent ? "true" : "false"}
                icon={Users}
                label="TEACHER ABSENT"
                description="No attendance within grace period — HOD notified"
                color="violet"
              />
            </div>
          )}

          {/* ── Attendance Section ── */}
          <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-5 dark:border-surface-800 dark:bg-surface-800/30">
            <SectionHeader
              icon={Users}
              title="Attendance"
              badge={
                graceActive ? `Grace: ${graceSec - periodSec}s left` : "Locked"
              }
            />

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Teacher status */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                    present
                      ? "bg-emerald-100 dark:bg-emerald-900/30"
                      : absent
                        ? "bg-red-100 dark:bg-red-900/30"
                        : "bg-surface-100 dark:bg-surface-800"
                  }`}
                >
                  {present ? (
                    <CheckCircle2
                      size={24}
                      className="text-emerald-600 dark:text-emerald-400"
                    />
                  ) : absent ? (
                    <XCircle
                      size={24}
                      className="text-red-600 dark:text-red-400"
                    />
                  ) : (
                    <Clock
                      size={24}
                      className="text-surface-400 animate-pulse"
                    />
                  )}
                </div>
                <div>
                  <p
                    className={`text-base font-bold ${
                      present
                        ? "text-emerald-700 dark:text-emerald-400"
                        : absent
                          ? "text-red-700 dark:text-red-400"
                          : "text-surface-600 dark:text-surface-300"
                    }`}
                  >
                    {present
                      ? "Teacher Present"
                      : absent
                        ? "Marked Absent"
                        : "Awaiting Arrival"}
                  </p>
                  <p className="text-xs text-surface-400">
                    Period {periodNum} • {periodSec}s elapsed
                  </p>
                </div>
              </div>

              {/* Grace progress bar */}
              <div className="w-full max-w-[200px]">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-surface-400 mb-1">
                  <span>Grace Period</span>
                  <span>{graceActive ? `${gracePercent}%` : "Complete"}</span>
                </div>
                <ProgressBar
                  percent={gracePercent}
                  color={
                    present
                      ? "bg-emerald-500"
                      : graceActive
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }
                />
              </div>
            </div>
          </div>

          {/* ── Sensor Readings ── */}
          <div>
            <SectionHeader icon={Gauge} title="Sensor Readings" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <WashroomAirCard
                gasValue={d.GS}
                dirtyActive={d.isWashroomDirty === "true"}
              />
              <Stat
                icon={Timer}
                label="Period Time"
                value={periodSec}
                unit="s"
                accent="bg-brand-500"
                sub={`of 60s period`}
              />
              <Stat
                icon={Zap}
                label="AC State"
                value={d.AC === "1" ? "Active" : "Off"}
                accent="bg-blue-500"
              />
              <Stat
                icon={ShieldAlert}
                label="Emergency"
                value={d.EM === "1" ? "Active" : "Clear"}
                accent="bg-red-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 2 — Cellular Network (GSM telemetry)
   ═══════════════════════════════════════════════════════════════ */

/* Map raw +CREG stat nibble to a human label */
function parseRegistration(raw) {
  if (!raw || raw === "—")
    return { label: "Unknown", ok: false, roaming: false };
  // raw can be "0,1" or "1" etc — take the last number
  const parts = String(raw).split(",");
  const stat = Number.parseInt(parts[parts.length - 1].trim(), 10);
  switch (stat) {
    case 0:
      return { label: "Not registered", ok: false, roaming: false };
    case 1:
      return { label: "Home network", ok: true, roaming: false };
    case 2:
      return { label: "Searching…", ok: false, roaming: false };
    case 3:
      return { label: "Registration denied", ok: false, roaming: false };
    case 5:
      return { label: "Roaming", ok: true, roaming: true };
    default:
      return { label: "Unknown", ok: false, roaming: false };
  }
}

/* Map AT+CPIN response to a human label + severity */
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

/* 5-bar cellular signal icon */
function SignalBars({ pct }) {
  const filled = pct === null ? 0 : Math.round((pct / 100) * 5);
  const barColor = (i) => {
    if (i >= filled) return "bg-surface-200 dark:bg-surface-700";
    if (pct >= 60) return "bg-emerald-500";
    if (pct >= 30) return "bg-amber-500";
    return "bg-red-500";
  };
  const heights = ["h-2", "h-3", "h-4", "h-5", "h-6"];
  return (
    <div className="flex items-end gap-[3px]">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-[5px] rounded-sm transition-all duration-500 ${h} ${barColor(i)}`}
        />
      ))}
    </div>
  );
}

function CellularPanel({ dataString }) {
  const d = useMemo(() => parseToObject(dataString), [dataString]);
  const empty = Object.keys(d).length === 0;
  const ready = d.gsmReady === "true";

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
      ? "No signal"
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

  /* SIM badge palette */
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
    <div className="rounded-2xl border border-surface-200 bg-white shadow-soft overflow-hidden dark:border-surface-800 dark:bg-surface-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4 dark:border-surface-800">
        <h3 className="flex items-center gap-2 text-base font-bold text-surface-800 dark:text-white">
          <Radio size={18} className="text-emerald-500" /> Cellular Network
        </h3>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${simPalette}`}
        >
          <StatusDot connected={sim.color === "emerald"} />
          {sim.label}
        </span>
      </div>

      {empty ? (
        <WaitingState icon={Signal} text="Connecting to cell tower…" />
      ) : (
        <div className="p-5 space-y-4">
          {/* ── Hero: Operator + Signal ── */}
          <div className="flex items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                Active Carrier
              </p>
              <p className="mt-0.5 text-xl font-black leading-tight">
                {operator}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                {network && (
                  <span className="rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide">
                    {network}
                  </span>
                )}
                <span className={`text-[11px] font-bold opacity-90`}>
                  {reg.roaming ? "🌐 Roaming" : reg.ok ? "Home" : reg.label}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <SignalBars pct={signalPct} />
              <p className="text-[10px] font-bold opacity-80">{signalLabel}</p>
              <p className="text-base font-black leading-none">
                {signalPct !== null ? `${signalPct}%` : "—"}
              </p>
            </div>
          </div>

          {/* ── Battery ── */}
          <div className="rounded-xl border border-surface-100 bg-surface-50/50 p-4 dark:border-surface-800 dark:bg-surface-800/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500">
                  <Zap size={15} className="text-white" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                  Modem Battery
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-surface-800 dark:text-white">
                  {batPct !== null ? `${batPct}%` : "—"}
                </span>
                {batVolt && (
                  <span className="ml-1.5 text-xs font-semibold text-surface-400">
                    {batVolt}V
                  </span>
                )}
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-700">
              <div
                className={`h-full rounded-full transition-all duration-700 ${batColor}`}
                style={{ width: batPct !== null ? `${batPct}%` : "0%" }}
              />
            </div>
            {batPct !== null && batPct <= 20 && (
              <p className="mt-1.5 text-[11px] font-bold text-red-500">
                ⚠ Low battery — charge modem soon
              </p>
            )}
          </div>

          {/* ── Status Row ── */}
          <div className="grid grid-cols-2 gap-3">
            {/* Registration */}
            <div className="flex flex-col gap-1 rounded-xl border border-surface-100 bg-surface-50/50 p-3 dark:border-surface-800 dark:bg-surface-800/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                Registration
              </p>
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${reg.ok ? "bg-emerald-500" : "bg-red-500"}`}
                />
                <p className="text-sm font-bold text-surface-700 dark:text-surface-200 leading-tight">
                  {reg.label}
                </p>
              </div>
              {reg.roaming && (
                <p className="text-[10px] font-semibold text-amber-500">
                  International roaming active
                </p>
              )}
            </div>

            {/* Signal CSQ */}
            <div className="flex flex-col gap-1 rounded-xl border border-surface-100 bg-surface-50/50 p-3 dark:border-surface-800 dark:bg-surface-800/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                Signal (CSQ)
              </p>
              <p className={`text-sm font-bold leading-tight ${signalColor}`}>
                {signalVal !== null ? `${signalVal}/31` : "—"}
              </p>
              <p className="text-[10px] font-semibold text-surface-400">
                {signalPct !== null ? `≈ ${signalPct}% quality` : "No reading"}
              </p>
            </div>

            {/* SMS Today */}
            <div className="flex flex-col gap-1 rounded-xl border border-surface-100 bg-surface-50/50 p-3 dark:border-surface-800 dark:bg-surface-800/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                SMS Sent Today
              </p>
              <p className="text-sm font-bold leading-tight text-surface-700 dark:text-surface-200">
                {smsToday}
              </p>
              <p className="text-[10px] font-semibold text-surface-400">
                Auto reset at 11:59 PM
              </p>
            </div>

            {/* SMS Month */}
            <div className="flex flex-col gap-1 rounded-xl border border-surface-100 bg-surface-50/50 p-3 dark:border-surface-800 dark:bg-surface-800/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                SMS Sent This Month
              </p>
              <p className="text-sm font-bold leading-tight text-surface-700 dark:text-surface-200">
                {smsMonth}
              </p>
              <p className="text-[10px] font-semibold text-surface-400">
                Counts successful sends only
              </p>
            </div>
          </div>

          {/* ── Device Identifiers ── */}
          {(imei || iccid) && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-surface-400 px-0.5">
                Device Identifiers
              </p>
              {imei && (
                <div className="flex items-center justify-between rounded-lg border border-surface-100 bg-surface-50/50 px-4 py-2.5 dark:border-surface-800 dark:bg-surface-900/50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-surface-400">
                    IMEI
                  </span>
                  <span className="font-mono text-[12px] font-semibold text-surface-700 dark:text-surface-300 tabular-nums">
                    {imei.replace(
                      /(\d{2})(\d{6})(\d{6})(\d{1})/,
                      "$1-$2-$3-$4"
                    )}
                  </span>
                </div>
              )}
              {iccid && (
                <div className="flex items-center justify-between rounded-lg border border-surface-100 bg-surface-50/50 px-4 py-2.5 dark:border-surface-800 dark:bg-surface-900/50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-surface-400">
                    ICCID
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-surface-700 dark:text-surface-300 tabular-nums tracking-wide">
                    {iccid.replace(/(\d{4})(\d{7})(\d{4})(\d+)/, "$1 $2 $3 $4")}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 3 — WiFi + ESP32 System Health
   ═══════════════════════════════════════════════════════════════ */

function SystemPanel({ wifiString, espString }) {
  const wifi = useMemo(() => parseToObject(wifiString), [wifiString]);
  const esp = useMemo(() => parseToObject(espString), [espString]);
  const empty = Object.keys(wifi).length === 0 && Object.keys(esp).length === 0;

  const rssi = wifi.rssi;
  const rssiPct = rssiToPercent(rssi);

  const heapKB = esp.heap ? Math.round(Number(esp.heap) / 1024) : null;
  const minHeapKB = esp.minHeap ? Math.round(Number(esp.minHeap) / 1024) : null;

  return (
    <div className="rounded-2xl border border-surface-200 bg-white shadow-soft overflow-hidden dark:border-surface-800 dark:bg-surface-900">
      <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4 dark:border-surface-800">
        <h3 className="flex items-center gap-2 text-base font-bold text-surface-800 dark:text-white">
          <Cpu size={18} className="text-indigo-500" /> System Health
        </h3>
        <span className="text-xs font-bold text-surface-400">
          <ArrowUpCircle size={13} className="inline mr-1" />
          {formatUptime(esp.uptime || wifi.uptime)}
        </span>
      </div>

      {empty ? (
        <WaitingState icon={Cpu} text="Fetching diagnostics…" />
      ) : (
        <div className="p-6 space-y-6">
          {/* WiFi Section */}
          <div>
            <SectionHeader icon={Wifi} title="WiFi Connection">
              {rssiPct !== null && (
                <span
                  className={`flex items-center gap-1.5 text-xs font-bold ${
                    rssiPct >= 60
                      ? "text-emerald-600"
                      : rssiPct >= 30
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  {rssiPct >= 60 ? (
                    <Wifi size={14} />
                  ) : rssiPct >= 30 ? (
                    <Wifi size={14} />
                  ) : (
                    <WifiOff size={14} />
                  )}
                  {rssiLabel(rssi)} ({rssi} dBm)
                </span>
              )}
            </SectionHeader>

            <div className="grid grid-cols-2 gap-3">
              <Stat
                icon={Wifi}
                label="Signal"
                value={rssiPct !== null ? `${rssiPct}%` : undefined}
                accent="bg-blue-500"
                sub={`${rssi || "—"} dBm`}
              />
              <Stat
                icon={Router}
                label="IP Address"
                value={wifi.ip}
                accent="bg-indigo-500"
              />
              <Stat
                icon={Signal}
                label="SSID"
                value={wifi.ssid}
                accent="bg-violet-500"
                sub={`Ch ${wifi.channel || "—"}`}
              />
              <Stat
                icon={ArrowUpCircle}
                label="Reconnects"
                value={wifi.reconnects}
                accent="bg-amber-500"
                sub={Number(wifi.reconnects) > 5 ? "High" : "Normal"}
              />
            </div>
          </div>

          {/* ESP32 Hardware */}
          <div className="border-t border-surface-100 pt-5 dark:border-surface-800">
            <SectionHeader icon={Cpu} title="ESP32 Hardware" />

            <div className="grid grid-cols-2 gap-3">
              <Stat
                icon={MemoryStick}
                label="Free Heap"
                value={heapKB}
                unit=" KB"
                accent="bg-emerald-500"
                sub={minHeapKB ? `Min: ${minHeapKB} KB` : undefined}
              />
              <Stat
                icon={Thermometer}
                label="Core Temp"
                value={esp.temp}
                unit="°C"
                accent="bg-orange-500"
                sub={
                  Number(esp.temp) > 70
                    ? "⚠ High"
                    : Number(esp.temp) > 50
                      ? "Warm"
                      : "Normal"
                }
              />
              <Stat
                icon={Gauge}
                label="CPU Speed"
                value={esp.cpuMHz}
                unit=" MHz"
                accent="bg-brand-500"
                sub={`${esp.cores || "—"} cores`}
              />
              <Stat
                icon={Database}
                label="Flash"
                value={
                  esp.flashKB
                    ? `${Math.round(Number(esp.flashKB) / 1024)} MB`
                    : undefined
                }
                accent="bg-slate-600"
                sub={`Reset: ${esp.resetReason ?? "—"}`}
              />
            </div>
          </div>

          {/* MAC footer */}
          <div className="flex items-center justify-center pt-2">
            <span className="rounded-full bg-surface-100 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-surface-400 dark:bg-surface-800">
              <Smartphone size={11} className="mr-1.5 inline" />
              MAC: <span className="font-mono">{wifi.mac || "—"}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN — DashboardHome
   ═══════════════════════════════════════════════════════════════ */

function loadCached() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}
function saveCached(d) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* quota */
  }
}

export default function DashboardHome() {
  const cached = useMemo(() => loadCached(), []);
  const [arduino, setArduino] = useState(cached?.arduino || "");
  const [wifi, setWifi] = useState(cached?.wifi || "");
  const [gsm, setGsm] = useState(cached?.gsm || "");
  const [esp, setEsp] = useState(cached?.esp || "");
  const [device, setDevice] = useState(cached?.device || "");
  const [pendingCmd, setPendingCmd] = useState(null);
  const wsRef = useRef(null);
  const arduinoRef = useRef(cached?.arduino || "");
  const gsmRef = useRef(cached?.gsm || "");
  const [wsStatus, setWsStatus] = useState("connecting");

  const wsUrl = useMemo(() => {
    const host = window.location.hostname || "localhost";
    return `ws://${host}:8080`;
  }, []);

  useEffect(() => {
    saveCached({ arduino, wifi, gsm, esp, device });
  }, [arduino, wifi, gsm, esp, device]);

  const applyPayload = useCallback((payload, category) => {
    const safe = String(payload || "");
    switch (category) {
      case "arduino":
        if (!shouldAcceptArduinoPayload(arduinoRef.current, safe)) return;
        arduinoRef.current = safe;
        setArduino(safe);
        break;
      case "wifi":
        setWifi(safe);
        break;
      case "gsm":
        if (!hasValidGsmData(safe) && gsmRef.current) return;
        gsmRef.current = safe;
        setGsm(safe);
        break;
      case "esp":
        setEsp(safe);
        break;
      case "device":
        setDevice(safe);
        break;
      default:
        if (safe.startsWith("class:")) {
          if (!shouldAcceptArduinoPayload(arduinoRef.current, safe)) return;
          arduinoRef.current = safe;
          setArduino(safe);
        }
        break;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let ws = null;
    let retryDelay = RECONNECT_BASE;
    let retryTimer = null;

    function openSocket() {
      if (!mounted) return;
      setWsStatus("connecting");
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mounted) {
          ws.close();
          return;
        }
        setWsStatus("connected");
        retryDelay = RECONNECT_BASE;
      };

      ws.onmessage = (event) => {
        if (!mounted) return;
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        switch (data.type) {
          case "telemetry":
            applyPayload(data.payload, data.category);
            break;
          case "control_status":
            if (data.status !== "sent") setPendingCmd(null);
            break;
          case "control_ack":
            setPendingCmd(null);
            break;
          default:
            break;
        }
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        if (!mounted) return;
        setWsStatus("disconnected");
        wsRef.current = null;
        retryTimer = setTimeout(openSocket, retryDelay);
        retryDelay = Math.min(retryDelay * 2, RECONNECT_MAX);
      };
    }

    openSocket();

    return () => {
      mounted = false;
      clearTimeout(retryTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      wsRef.current = null;
    };
  }, [wsUrl, applyPayload]);

  const sendCommand = useCallback(
    (cmd) => {
      if (
        pendingCmd ||
        !wsRef.current ||
        wsRef.current.readyState !== WebSocket.OPEN
      )
        return;
      setPendingCmd(cmd);
      wsRef.current.send(
        JSON.stringify({
          type: "control",
          device: "CLASSROOM-706",
          command: cmd,
        })
      );
      setTimeout(() => setPendingCmd((p) => (p === cmd ? null : p)), 8000);
    },
    [pendingCmd]
  );

  /* Parsed arduino data for period-aware Force Present button */
  const arduinoParsed = useMemo(() => parseToObject(arduino), [arduino]);
  const graceActive =
    arduinoParsed.PT !== undefined && Number(arduinoParsed.PT) < 10;
  const teacherAlreadyPresent = arduinoParsed.isPresent === "true";

  /* Device info */
  const devInfo = useMemo(() => parseToObject(device), [device]);

  const actions = [
    {
      cmd: "AC_REQUEST",
      label: "AC Request",
      desc: "Send AC toggle to maintenance",
      icon: Wind,
      color:
        "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 focus-visible:ring-blue-400",
    },
    {
      cmd: "EMERGENCY_REQ",
      label: "Emergency",
      desc: "Trigger alarm + call admin",
      icon: ShieldAlert,
      color:
        "bg-red-600 hover:bg-red-700 shadow-red-500/25 focus-visible:ring-red-400",
    },
    {
      cmd: "WASHROOM_REQUEST",
      label: "Washroom",
      desc: "Notify cleaning staff",
      icon: Droplets,
      color:
        "bg-amber-600 hover:bg-amber-700 shadow-amber-500/25 focus-visible:ring-amber-400",
    },
    {
      cmd: "TEACHER_FORCE_PRESENT",
      label: "Force Present",
      desc: teacherAlreadyPresent
        ? "Teacher already marked present"
        : graceActive
          ? "Mark teacher via web"
          : "Grace period expired",
      icon: Users,
      color: teacherAlreadyPresent
        ? "bg-surface-400 hover:bg-surface-400 shadow-surface-400/20 focus-visible:ring-surface-400"
        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25 focus-visible:ring-emerald-400",
      disabled: !graceActive || teacherAlreadyPresent,
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* ═══ Top Bar: Title + Connection ═══ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-surface-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm font-medium text-surface-500">
            Real-time classroom monitoring & remote management
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Device firmware pill */}
          {devInfo.firmware && (
            <span className="hidden rounded-full bg-surface-100 px-3 py-1.5 text-[10px] font-bold text-surface-500 dark:bg-surface-800 sm:inline-flex">
              FW {devInfo.firmware}
            </span>
          )}

          {/* Connection status */}
          <span
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${
              wsStatus === "connected"
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800"
                : wsStatus === "connecting"
                  ? "bg-amber-50 text-amber-700 ring-amber-200 animate-pulse dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800"
                  : "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800"
            }`}
          >
            <StatusDot connected={wsStatus === "connected"} />
            {wsStatus === "connected"
              ? "Live"
              : wsStatus === "connecting"
                ? "Connecting…"
                : "Offline"}
          </span>
        </div>
      </div>

      {/* ═══ Quick Actions ═══ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map(
          ({ cmd, label, desc, icon: BtnIcon, color, disabled: forceDis }) => {
            const isDisabled =
              forceDis || pendingCmd !== null || wsStatus !== "connected";
            const sending = pendingCmd === cmd;

            return (
              <button
                key={cmd}
                disabled={isDisabled}
                onClick={() => sendCommand(cmd)}
                className={`group relative flex flex-col items-start gap-1 rounded-xl px-5 py-4 text-left text-white shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${color}`}
              >
                <div className="flex w-full items-center justify-between">
                  {sending ? (
                    <Activity className="animate-spin" size={20} />
                  ) : (
                    <BtnIcon size={20} />
                  )}
                  {sending && (
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      Sending…
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold leading-tight">{label}</span>
                <span className="text-[11px] leading-tight opacity-70">
                  {desc}
                </span>
              </button>
            );
          }
        )}
      </div>

      {/* ═══ Main Dashboard Grid ═══ */}
      <ClassroomPanel dataString={arduino} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CellularPanel dataString={gsm} />
        <SystemPanel wifiString={wifi} espString={esp} />
      </div>
    </div>
  );
}
