import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  Droplets,
  Gauge,
  Radio,
  ShieldAlert,
  Signal,
  Timer,
  Users,
  Wifi,
  WifiOff,
  Wind,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AnimatedPage from "../../../core/components/AnimatedPage";
import { useTelemetry } from "../context/TelemetryContext";

/* ================================================================
   EduGuard Dashboard – Redesigned Professional Edition
   ================================================================ */

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
function WashroomAirCard({ gasValue, dirtyActive, gasThreshold }) {
  const gs = Number(gasValue) || 0;
  const threshold = Number(gasThreshold) || 2800;
  const lowZone = Math.round(
    threshold * 0.57
  ); /* ~57% of threshold as "Normal" ceiling */
  const SCALE = Math.max(4000, threshold * 1.5);
  const isCritical = gs > threshold;
  const isElevated = gs > lowZone && !isCritical;
  const pct = Math.min(97, (gs / SCALE) * 100);

  const status = isCritical ? "Critical" : isElevated ? "Elevated" : "Normal";
  const c = isCritical
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
          <span className="text-emerald-500">Normal ≤{lowZone}</span>
          <span className="text-amber-500">Elevated ≤{threshold}</span>
          <span className="text-red-500">{`Critical >${threshold}`}</span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-full">
          {/* Colour zone bands — widths derived from threshold ratio */}
          <div className="absolute inset-0 flex">
            <div
              className="h-full bg-emerald-300/70 dark:bg-emerald-700/50"
              style={{ width: `${Math.round((lowZone / SCALE) * 100)}%` }}
            />
            <div
              className="h-full bg-amber-300/70 dark:bg-amber-700/50"
              style={{
                width: `${Math.round(((threshold - lowZone) / SCALE) * 100)}%`,
              }}
            />
            <div
              className="h-full bg-red-300/70 dark:bg-red-700/50"
              style={{
                width: `${100 - Math.round((threshold / SCALE) * 100)}%`,
              }}
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

function ClassroomPanel({
  dataString,
  graceSec = 10,
  periodDurationSec = 60,
  gasThreshold = 2800,
  classroom,
  telemetryFresh = true,
}) {
  const d = useMemo(() => parseToObject(dataString), [dataString]);
  const empty = Object.keys(d).length === 0;

  /* ── Use raw telemetry values directly — ESP32 sends every ~1 s, no interpolation needed ── */
  const liveClock = d.T || "";
  const periodSec = d.PT !== undefined ? Math.max(0, Number(d.PT)) : 0;
  const periodNum = d.P || "—";
  const graceActive = periodSec < graceSec;
  const gracePercent = graceActive
    ? Math.round((periodSec / graceSec) * 100)
    : 100;

  const present = d.isPresent === "true";
  const absent = d.isTeacherAbsent === "true";
  const systemOn = telemetryFresh && d.isSystemActive === "true";

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
              Room {d.class || classroom || "—"}
              <span className="text-sm font-bold text-brand-200/80">
                Period {periodNum}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Device data freshness pill */}
            {!telemetryFresh && !empty && (
              <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/30">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                No Live Data
              </span>
            )}
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
                description="AC request sent to security department"
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
                gasThreshold={gasThreshold}
              />
              <Stat
                icon={Timer}
                label="Period Time"
                value={periodSec}
                unit="s"
                accent="bg-brand-500"
                sub={`of ${periodDurationSec}s period`}
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
   LIVE EVENT FEED — Real-time trigger log
   ═══════════════════════════════════════════════════════════════ */

const EVENT_DEFS = {
  emergency: {
    icon: ShieldAlert,
    label: "Emergency Triggered",
    detail: "Alarm activated — admin notified via SMS & call",
    color: "red",
  },
  acRequest: {
    icon: Wind,
    label: "AC Requested",
    detail: "AC request sent to security department",
    color: "blue",
  },
  washroom: {
    icon: Droplets,
    label: "Washroom Alert",
    detail: "Gas sensor threshold breached — cleaning staff notified",
    color: "amber",
  },
  teacherAbsent: {
    icon: AlertTriangle,
    label: "Teacher Absent",
    detail: "No attendance within grace period — HOD notified",
    color: "violet",
  },
  teacherPresent: {
    icon: CheckCircle2,
    label: "Teacher Arrived",
    detail: "Attendance confirmed via sensor or manual button or dashboard",
    color: "emerald",
  },
  periodChange: {
    icon: Bell,
    label: "Period Changed",
    detail: "Bell rung — new period started",
    color: "brand",
  },
};

const EVENT_COLORS = {
  red: {
    dot: "bg-red-500",
    glow: "shadow-red-500/40",
    iconBg: "bg-red-100 dark:bg-red-900/30",
    iconFg: "text-red-600 dark:text-red-400",
    badge:
      "bg-red-50 text-red-700 ring-red-200/60 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800/40",
  },
  blue: {
    dot: "bg-blue-500",
    glow: "shadow-blue-500/40",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconFg: "text-blue-600 dark:text-blue-400",
    badge:
      "bg-blue-50 text-blue-700 ring-blue-200/60 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-800/40",
  },
  amber: {
    dot: "bg-amber-500",
    glow: "shadow-amber-500/40",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconFg: "text-amber-600 dark:text-amber-400",
    badge:
      "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800/40",
  },
  violet: {
    dot: "bg-violet-500",
    glow: "shadow-violet-500/40",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconFg: "text-violet-600 dark:text-violet-400",
    badge:
      "bg-violet-50 text-violet-700 ring-violet-200/60 dark:bg-violet-900/20 dark:text-violet-400 dark:ring-violet-800/40",
  },
  emerald: {
    dot: "bg-emerald-500",
    glow: "shadow-emerald-500/40",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconFg: "text-emerald-600 dark:text-emerald-400",
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800/40",
  },
  brand: {
    dot: "bg-brand-500",
    glow: "shadow-brand-500/40",
    iconBg: "bg-brand-100 dark:bg-brand-900/30",
    iconFg: "text-brand-600 dark:text-brand-400",
    badge:
      "bg-brand-50 text-brand-700 ring-brand-200/60 dark:bg-brand-900/20 dark:text-brand-400 dark:ring-brand-800/40",
  },
  cyan: {
    dot: "bg-cyan-500",
    glow: "shadow-cyan-500/40",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/30",
    iconFg: "text-cyan-600 dark:text-cyan-400",
    badge:
      "bg-cyan-50 text-cyan-700 ring-cyan-200/60 dark:bg-cyan-900/20 dark:text-cyan-400 dark:ring-cyan-800/40",
  },
};

function formatEventTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 5) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function LiveEventFeed({ events }) {
  const scrollRef = useRef(null);
  const [, setTick] = useState(0);

  /* Auto-scroll to top on new events */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [events.length]);

  /* Update relative timestamps every 10s */
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="rounded-2xl border border-surface-200/80 bg-white shadow-sm overflow-hidden dark:border-surface-800 dark:bg-surface-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4 dark:border-surface-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
            <Activity size={15} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-surface-800 dark:text-white">
              Live Activity Feed
            </h3>
            <p className="text-[10px] font-semibold text-surface-400">
              Latest {events.length} event{events.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {events.length > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 ring-1 ring-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800/40">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live
          </span>
        )}
      </div>

      {/* Event list */}
      <div
        ref={scrollRef}
        className="max-h-[420px] overflow-y-auto scroll-smooth"
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-surface-400 dark:text-surface-500">
            <Clock className="animate-pulse" size={24} />
            <p className="text-xs font-medium">
              No events yet — waiting for triggers…
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100/80 dark:divide-surface-800/60">
            {events.map((ev, i) => {
              const def = EVENT_DEFS[ev.type] || EVENT_DEFS.periodChange;
              const EvIcon = def.icon;
              const pal = EVENT_COLORS[def.color] || EVENT_COLORS.brand;
              const isNew = i === 0;

              return (
                <div
                  key={ev.id}
                  className={`group relative flex items-start gap-3.5 px-6 py-4 transition-colors hover:bg-surface-50/50 dark:hover:bg-surface-800/30 ${
                    isNew ? "animate-fade-in" : ""
                  }`}
                >
                  {/* Timeline dot + connector */}
                  <div className="relative flex flex-col items-center">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${pal.iconBg}`}
                    >
                      <EvIcon size={16} className={pal.iconFg} />
                    </div>
                    {i < events.length - 1 && (
                      <div className="mt-1 h-full w-px bg-surface-200/60 dark:bg-surface-700/40" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-surface-800 dark:text-white">
                        {def.label}
                      </p>
                      {isNew && (
                        <span className="rounded bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-surface-500 dark:text-surface-400">
                      {ev.detail || def.detail}
                    </p>
                    {ev.meta && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {Object.entries(ev.meta).map(([k, v]) => (
                          <span
                            key={k}
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${pal.badge}`}
                          >
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="shrink-0 pt-0.5 text-right">
                    <p className="text-[11px] font-bold tabular-nums text-surface-500 dark:text-surface-400">
                      {formatEventTime(ev.ts)}
                    </p>
                    <p className="text-[10px] font-semibold text-surface-400 dark:text-surface-500">
                      {timeAgo(ev.ts)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN — DashboardHome
   ═══════════════════════════════════════════════════════════════ */

export default function DashboardHome() {
  const {
    arduino,
    wifi,
    gsm,
    device,
    configParsed,
    wsStatus,
    pendingCmd,
    sendCommand,
    events: allEvents,
    telemetryFresh,
    deviceOnline,
  } = useTelemetry();

  /* Parsed telemetry data */
  const arduinoParsed = useMemo(() => parseToObject(arduino), [arduino]);
  const wifiParsed = useMemo(() => parseToObject(wifi), [wifi]);
  const gsmParsed = useMemo(() => parseToObject(gsm), [gsm]);
  const devInfo = useMemo(() => parseToObject(device), [device]);

  /* Config-derived values — drive entire dashboard from live settings */
  const graceSec = Number(configParsed.graceDuration) || 10;
  const periodDurationSec = Number(configParsed.periodDuration) || 60;
  const gasThreshold = Number(configParsed.gasThreshold) || 2800;
  const classroom = configParsed.classroom || "—";
  const teacherAlreadyPresent = arduinoParsed.isPresent === "true";

  /* Events from shared context (show latest 10 on dashboard) */
  const events = useMemo(() => allEvents.slice(0, 10), [allEvents]);

  /* ── Status Bar Indicators ── */
  /* When telemetry is stale, override all device-side indicators to offline/unknown */
  const systemActive =
    telemetryFresh && arduinoParsed.isSystemActive === "true";
  const wifiConnected =
    telemetryFresh &&
    wifiParsed.rssi !== undefined &&
    wifiParsed.rssi !== "" &&
    !!wifiParsed.ip;
  const wifiRssi =
    telemetryFresh && wifiParsed.rssi ? Number(wifiParsed.rssi) : null;
  const gsmOk = telemetryFresh && gsmParsed.gsmReady === "true";
  const gsmSignal =
    telemetryFresh && gsmParsed.signal && gsmParsed.signal !== "N/A"
      ? gsmParsed.signal
      : null;
  const wsOk = wsStatus === "connected" && (deviceOnline || telemetryFresh);

  const actions = [
    {
      cmd: "AC_REQUEST",
      label: "AC Request",
      desc: "Request AC from security dept",
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
        : "Mark teacher present via web",
      icon: Users,
      color: teacherAlreadyPresent
        ? "bg-surface-400 hover:bg-surface-400 shadow-surface-400/20 focus-visible:ring-surface-400"
        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25 focus-visible:ring-emerald-400",
      disabled: teacherAlreadyPresent,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ═══ Top Bar: Title + Connection — renders instantly, no animation ═══ */}
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

          {/* Connection status — "Live" only when device is actually sending data */}
          <span
            className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${
              wsStatus === "connected" && telemetryFresh
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800"
                : wsStatus === "connected"
                  ? "bg-amber-50 text-amber-700 ring-amber-200 animate-pulse dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800"
                  : wsStatus === "connecting"
                    ? "bg-amber-50 text-amber-700 ring-amber-200 animate-pulse dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800"
                    : "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800"
            }`}
          >
            <StatusDot connected={wsStatus === "connected" && telemetryFresh} />
            {wsStatus === "connected" && telemetryFresh
              ? "Live"
              : wsStatus === "connected"
                ? "No Device"
                : wsStatus === "connecting"
                  ? "Connecting…"
                  : "Offline"}
          </span>
        </div>
      </div>

      {/* ═══ System Status Bar ═══ */}
      <div className="relative overflow-hidden rounded-2xl border border-surface-200/80 bg-white/80 shadow-sm backdrop-blur dark:border-surface-700/60 dark:bg-surface-800/80">
        <div className="absolute inset-0 bg-gradient-to-r from-surface-50/50 via-transparent to-surface-50/50 dark:from-surface-900/30 dark:via-transparent dark:to-surface-900/30" />
        <div className="relative flex flex-wrap items-stretch divide-x divide-surface-200/60 dark:divide-surface-700/50">
          {/* System Active */}
          <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 sm:px-5">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                systemActive
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                  : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
              }`}
            >
              <Activity size={16} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full shadow-sm ${
                    systemActive
                      ? "bg-emerald-500 shadow-emerald-500/50"
                      : "bg-red-500 shadow-red-500/50"
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wide text-surface-700 dark:text-surface-200">
                  System
                </span>
              </div>
              <p
                className={`mt-0.5 truncate text-[11px] font-semibold ${
                  systemActive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {systemActive ? "Active" : "Inactive"}
              </p>
            </div>
          </div>

          {/* WiFi */}
          <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 sm:px-5">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                wifiConnected
                  ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400"
                  : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
              }`}
            >
              {wifiConnected ? (
                <Wifi size={16} strokeWidth={2.5} />
              ) : (
                <WifiOff size={16} strokeWidth={2.5} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full shadow-sm ${
                    wifiConnected
                      ? "bg-emerald-500 shadow-emerald-500/50"
                      : "bg-red-500 shadow-red-500/50"
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wide text-surface-700 dark:text-surface-200">
                  WiFi
                </span>
              </div>
              <p
                className={`mt-0.5 truncate text-[11px] font-semibold ${
                  wifiConnected
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {wifiConnected
                  ? `Connected${wifiRssi !== null ? ` · ${wifiRssi} dBm` : ""}`
                  : "Disconnected"}
              </p>
            </div>
          </div>

          {/* GSM */}
          <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 sm:px-5">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                gsmOk
                  ? "bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400"
                  : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
              }`}
            >
              <Signal size={16} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full shadow-sm ${
                    gsmOk
                      ? "bg-emerald-500 shadow-emerald-500/50"
                      : "bg-red-500 shadow-red-500/50"
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wide text-surface-700 dark:text-surface-200">
                  GSM
                </span>
              </div>
              <p
                className={`mt-0.5 truncate text-[11px] font-semibold ${
                  gsmOk
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {gsmOk
                  ? `Ready${gsmSignal ? ` · Signal ${gsmSignal}` : ""}`
                  : "Not Ready"}
              </p>
            </div>
          </div>

          {/* WebSocket */}
          <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 sm:px-5">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                wsOk
                  ? "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/40 dark:text-cyan-400"
                  : "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
              }`}
            >
              <Radio size={16} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full shadow-sm ${
                    wsOk
                      ? "bg-emerald-500 shadow-emerald-500/50"
                      : "bg-red-500 shadow-red-500/50"
                  }`}
                />
                <span className="text-xs font-bold uppercase tracking-wide text-surface-700 dark:text-surface-200">
                  WebSocket
                </span>
              </div>
              <p
                className={`mt-0.5 truncate text-[11px] font-semibold ${
                  wsOk
                    ? "text-cyan-600 dark:text-cyan-400"
                    : "text-red-500 dark:text-red-400"
                }`}
              >
                {wsOk
                  ? "Connected"
                  : wsStatus === "connecting"
                    ? "Connecting…"
                    : wsStatus === "connected" && !deviceOnline
                      ? "Device Offline"
                      : "Disconnected"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Animated content below the status bar ═══ */}
      <AnimatedPage>
        {/* ═══ Quick Actions ═══ */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {actions.map(
            ({
              cmd,
              label,
              desc,
              icon: BtnIcon,
              color,
              disabled: forceDis,
            }) => {
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
                  <span className="text-sm font-bold leading-tight">
                    {label}
                  </span>
                  <span className="text-[11px] leading-tight opacity-70">
                    {desc}
                  </span>
                </button>
              );
            }
          )}
        </div>

        {/* ═══ Classroom Live View ═══ */}
        <ClassroomPanel
          dataString={arduino}
          graceSec={graceSec}
          periodDurationSec={periodDurationSec}
          gasThreshold={gasThreshold}
          classroom={classroom}
          telemetryFresh={telemetryFresh}
        />

        {/* ═══ Live Event Feed ═══ */}
        <LiveEventFeed events={events} />
      </AnimatedPage>
    </div>
  );
}
