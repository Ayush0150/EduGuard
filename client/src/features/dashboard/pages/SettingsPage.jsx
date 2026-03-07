/**
 * SettingsPage – Full Device Configuration Dashboard
 * ---------------------------------------------------
 * All ESP32 settings with premium UI. Changes are sent via
 * WebSocket `sendCommand` to the device in real-time.
 * Current values shown are defaults — will be synced from device
 * once the command protocol supports config queries.
 */

import {
  AlertTriangle,
  Clock,
  Hash,
  MessageSquare,
  Phone,
  Power,
  RotateCcw,
  Save,
  Wind,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnimatedPage from "../../../core/components/AnimatedPage";
import PasswordConfirmModal from "../../../core/components/PasswordConfirmModal";
import { useTelemetry } from "../context/TelemetryContext";

/* ── Parse key=value payload string to object ── */
function parseConfig(raw) {
  const obj = {};
  if (!raw) return obj;
  String(raw)
    .split(",")
    .forEach((part) => {
      const i = part.indexOf("=");
      if (i > 0) obj[part.slice(0, i).trim()] = part.slice(i + 1).trim();
    });
  return obj;
}

/* ── Parse arduino payload (key:value or key=value, comma separated) ── */
function parseArduinoPayload(raw) {
  const obj = {};
  if (!raw) return obj;
  String(raw)
    .split(",")
    .forEach((part) => {
      const p = part.trim();
      if (!p) return;
      if (p.includes("=")) {
        const i = p.indexOf("=");
        let k = p.slice(0, i).trim();
        if (k.includes(":")) k = k.split(":")[1];
        obj[k] = p.slice(i + 1).trim();
      } else if (p.includes(":")) {
        const i = p.indexOf(":");
        obj[p.slice(0, i).trim()] = p.slice(i + 1).trim();
      }
    });
  return obj;
}

/* ── Parse pipe-delimited SMS template payload ── */
function parseSmsTemplates(raw) {
  const obj = {};
  if (!raw) return obj;
  String(raw)
    .split("|")
    .forEach((part) => {
      const i = part.indexOf("=");
      if (i > 0) obj[part.slice(0, i).trim()] = part.slice(i + 1).trim();
    });
  return obj;
}

/* ── SMS placeholder definitions ── */
const SMS_PLACEHOLDERS = [
  { tag: "{room}", label: "Room", preview: "706" },
  { tag: "{time}", label: "Time", preview: "09:15:30" },
  { tag: "{period}", label: "Period", preview: "3" },
  { tag: "{gas}", label: "Gas", preview: "2950" },
  { tag: "{date}", label: "Date", preview: "21/06/2025" },
];

/* ── Build preview by replacing placeholders with example values ── */
function buildPreview(template) {
  let result = template;
  SMS_PLACEHOLDERS.forEach(({ tag, preview }) => {
    result = result.replaceAll(tag, preview);
  });
  return result;
}

/* ── Sanitise template input — strip chars that break JSON/protocol ── */
function sanitiseTemplate(val) {
  return val.replace(/["\\|\r\n]/g, "").slice(0, 160);
}

/* ── Save-button label from status code ── */
function saveLabel(status, defaultLabel = "Save") {
  if (status === "saving") return "Saving…";
  if (status === "saved") return "Saved!";
  if (status === "error") return "Failed";
  return defaultLabel;
}

/* ═══════════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ═══════════════════════════════════════════════════════════════ */

function SectionCard({ icon: Icon, title, description, accent, children }) {
  const iconBg = accent || "bg-brand-500";
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-200/60 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-surface-700/50 dark:bg-surface-900/60 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      <div className="flex items-center gap-4 border-b border-surface-100 bg-surface-50/50 px-6 py-5 dark:border-surface-800/60 dark:bg-surface-800/20">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-inner ring-1 ring-inset ring-white/20 ${iconBg}`}
        >
          <Icon size={18} className="text-white drop-shadow-sm" />
        </div>
        <div>
          <h3 className="text-[15px] font-bold tracking-tight text-surface-900 dark:text-white">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-[12px] font-medium text-surface-500 dark:text-surface-400">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="divide-y divide-surface-100/80 dark:divide-surface-800/60">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between hover:bg-surface-50/30 transition-colors dark:hover:bg-surface-800/20">
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-[14px] font-semibold text-surface-900 dark:text-surface-100">
          {label}
        </p>
        {description && (
          <p className="mt-1 text-[13px] leading-relaxed text-surface-500 dark:text-surface-400">
            {description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </div>
  );
}

function Toggle({ enabled, onChange, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      aria-checked={enabled}
      role="switch"
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-surface-900 ${
        enabled
          ? "bg-emerald-500"
          : "bg-surface-300 dark:bg-surface-600"
      } ${disabled ? "cursor-not-allowed opacity-50" : "active:scale-95"}`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-300 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function NumberInput({ value, onChange, min, max, step = 1, unit, disabled }) {
  const [draft, setDraft] = useState(() => String(value));
  const [committed, setCommitted] = useState(value);

  if (value !== committed) {
    setCommitted(value);
    setDraft(String(value));
  }

  return (
    <div className="relative flex items-center group">
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          const v = Number(draft);
          if (draft === "" || Number.isNaN(v)) {
            setDraft(String(committed));
          } else {
            setCommitted(v);
            onChange(v);
          }
        }}
        className={`h-9 w-28 rounded-xl border border-surface-200 bg-surface-50 pl-3 pr-8 text-[13px] font-bold tabular-nums text-surface-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:focus:border-brand-500 dark:focus:bg-surface-800 ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      />
      {unit && (
        <span className="absolute right-3 pointer-events-none text-[11px] font-bold text-surface-400 group-focus-within:text-brand-500 transition-colors">
          {unit}
        </span>
      )}
    </div>
  );
}

function PhoneInput({ value, onChange, placeholder, disabled }) {
  return (
    <input
      type="tel"
      value={value}
      disabled={disabled}
      placeholder={placeholder || "10-digit number"}
      maxLength={10}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 10);
        onChange(v);
      }}
      className="h-9 w-40 rounded-xl border border-surface-200 bg-surface-50 px-3.5 text-[13px] font-mono font-bold tracking-wider tabular-nums text-surface-900 outline-none transition-all placeholder:text-surface-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:placeholder:text-surface-600 dark:focus:border-brand-500 dark:focus:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

function TimeInput({ value, onChange, disabled }) {
  return (
    <input
      type="time"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-32 rounded-xl border border-surface-200 bg-surface-50 px-3.5 text-[13px] font-bold text-surface-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:focus:border-brand-500 dark:focus:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  variant = "primary",
  disabled,
  small,
}) {
  const base = small ? "px-3 py-1.5 text-[12px]" : "px-4 py-2.5 text-[14px]";
  const variants = {
    primary:
      "bg-surface-900 text-white shadow-sm hover:bg-surface-800 dark:bg-white dark:text-surface-900 dark:hover:bg-surface-100",
    danger:
      "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200/60 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 dark:border-red-900/30",
    warning:
      "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20 dark:border-amber-900/30",
    secondary:
      "bg-white text-surface-700 hover:bg-surface-50 border border-surface-200 shadow-sm dark:bg-surface-800 dark:text-surface-200 dark:border-surface-700 dark:hover:bg-surface-700",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-surface-900 ${base} ${variants[variant]} ${
        disabled ? "cursor-not-allowed opacity-50 shadow-none" : "active:scale-[0.97]"
      }`}
    >
      {Icon && <Icon size={small ? 14 : 16} strokeWidth={2.5} />}
      {label}
    </button>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
        active
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" : "bg-surface-400"
        }`}
      />
      {active ? "On" : "Off"}
    </span>
  );
}

function TemplateEditor({
  label,
  description,
  value,
  onChange,
  onSave,
  saveStatus: tplStatus,
  disabled,
}) {
  const textareaRef = useRef(null);
  const charCount = value.length;
  const overLimit = charCount > 160;
  const preview = buildPreview(value);

  const insertPlaceholder = useCallback(
    (tag) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const before = value.slice(0, start);
      const after = value.slice(end);
      const next = sanitiseTemplate(before + tag + after);
      onChange(next);
      requestAnimationFrame(() => {
        const pos = start + tag.length;
        ta.selectionStart = ta.selectionEnd = pos;
        ta.focus();
      });
    },
    [value, onChange]
  );

  return (
    <div className="space-y-4 px-6 py-5 hover:bg-surface-50/30 transition-colors dark:hover:bg-surface-800/20">
      {/* Header */}
      <div>
        <p className="text-[14px] font-semibold text-surface-900 dark:text-surface-100">
          {label}
        </p>
        {description && (
          <p className="mt-1 text-[13px] text-surface-500 dark:text-surface-400">{description}</p>
        )}
      </div>

      {/* Placeholder Buttons */}
      <div className="flex flex-wrap gap-2">
        {SMS_PLACEHOLDERS.map(({ tag, label: lbl }) => (
          <button
            key={tag}
            type="button"
            disabled={disabled}
            onClick={() => insertPlaceholder(tag)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-surface-700 shadow-sm transition-all hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700 active:scale-95 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:border-brand-500 dark:hover:bg-brand-500/10 dark:hover:text-brand-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="font-mono text-brand-600 dark:text-brand-400">{tag}</span>
            <span className="text-[10px] font-semibold text-surface-400">
              {lbl}
            </span>
          </button>
        ))}
      </div>

      {/* Textarea + Counter */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          rows={2}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(sanitiseTemplate(e.target.value))}
          placeholder="Type your SMS template…"
          className="w-full resize-none rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 font-mono text-[13px] leading-relaxed text-surface-900 outline-none transition-all placeholder:text-surface-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:placeholder:text-surface-600 dark:focus:border-brand-500 dark:focus:bg-surface-800 disabled:opacity-50"
        />
        <span
          className={`absolute bottom-3 right-4 text-[11px] font-bold tabular-nums bg-white/80 dark:bg-surface-900/80 backdrop-blur px-1 rounded ${
            overLimit
              ? "text-red-500"
              : charCount > 140
                ? "text-amber-500"
                : "text-surface-400 dark:text-surface-500"
          }`}
        >
          {charCount}/160
        </span>
      </div>

      {/* Live Preview & Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1 rounded-xl border border-dashed border-surface-200 bg-surface-50/50 px-4 py-3 dark:border-surface-700 dark:bg-surface-800/50">
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-surface-400">
            Preview
          </p>
          <p className="font-mono text-[13px] leading-relaxed text-surface-800 dark:text-surface-200">
            {preview}
          </p>
        </div>

        <div className="shrink-0">
          <ActionButton
            icon={Save}
            label={
              tplStatus === "saving"
                ? "Saving…"
                : tplStatus === "saved"
                  ? "Saved!"
                  : tplStatus === "error"
                    ? "Failed"
                    : "Save Template"
            }
            small
            disabled={disabled || !value || overLimit || tplStatus === "saving"}
            onClick={onSave}
          />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SETTINGS PAGE
   ═══════════════════════════════════════════════════════════════ */

export default function SettingsPage() {
  const {
    sendRawCommand,
    sendTrackedCommand,
    wsStatus,
    telemetryFresh,
    config,
    smsTemplates,
    arduino,
    deviceId,
  } = useTelemetry();

  const wsConnectedNow = wsStatus === "connected";
  const [connected, setConnected] = useState(wsConnectedNow);
  const offlineTimerRef = useRef(null);

  useEffect(() => {
    if (wsConnectedNow) {
      clearTimeout(offlineTimerRef.current);
      setTimeout(() => setConnected(true), 0);
    } else {
      offlineTimerRef.current = setTimeout(() => setConnected(false), 1500);
    }
    return () => clearTimeout(offlineTimerRef.current);
  }, [wsConnectedNow]);

  const [appliedConfig, setAppliedConfig] = useState("");
  const [appliedTemplates, setAppliedTemplates] = useState("");
  const [prevArduino, setPrevArduino] = useState(arduino);
  const [userEditedTime, setUserEditedTime] = useState(false);

  const [initCfg] = useState(() => parseConfig(config));
  const [initTpl] = useState(() => parseSmsTemplates(smsTemplates));

  const [hardwareEnabled, setHardwareEnabled] = useState(
    initCfg.hwEnabled !== undefined ? initCfg.hwEnabled === "true" : true
  );
  const [gsmEnabled, setGsmEnabled] = useState(
    initCfg.gsmEnabled !== undefined ? initCfg.gsmEnabled === "true" : true
  );
  const [phoneEmergency, setPhoneEmergency] = useState(
    initCfg.phoneEmergency || "9260963100"
  );
  const [phoneTeacherAbsent, setPhoneTeacherAbsent] = useState(
    initCfg.phoneAbsent || "9260963100"
  );
  const [phoneWashroom, setPhoneWashroom] = useState(
    initCfg.phoneWashroom || "9260963100"
  );
  const [phoneAC, setPhoneAC] = useState(initCfg.phoneAC || "9260963100");
  const [systemTime, setSystemTime] = useState("");
  const [totalPeriods, setTotalPeriods] = useState(
    Number(initCfg.totalPeriods) || 10
  );
  const [periodDuration, setPeriodDuration] = useState(
    Number(initCfg.periodDuration) || 60
  );
  const [washroomThreshold, setWashroomThreshold] = useState(
    Number(initCfg.gasThreshold) || 2800
  );
  const [teacherGrace, setTeacherGrace] = useState(
    Number(initCfg.graceDuration) || 10
  );
  const [missedCallEnabled, setMissedCallEnabled] = useState(
    initCfg.callEnabled !== undefined ? initCfg.callEnabled === "true" : true
  );
  const [emBuzzerDuration, setEmBuzzerDuration] = useState(
    Number(initCfg.emBuzzerDuration) || 5
  );
  const [classroomNo, setClassroomNo] = useState(initCfg.classroom || "706");
  const [autoRebootEnabled, setAutoRebootEnabled] = useState(
    initCfg.autoReboot !== undefined ? initCfg.autoReboot === "true" : false
  );
  const [autoRebootTime, setAutoRebootTime] = useState(() => {
    if (
      initCfg.autoRebootH !== undefined &&
      initCfg.autoRebootM !== undefined
    ) {
      const hh = String(initCfg.autoRebootH).padStart(2, "0");
      const mm = String(initCfg.autoRebootM).padStart(2, "0");
      return `${hh}:${mm}`;
    }
    return "03:00";
  });
  const [tplEmergency, setTplEmergency] = useState(
    initTpl.tplEmergency || "EMERGENCY Room {room} at {time}"
  );
  const [tplAbsent, setTplAbsent] = useState(
    initTpl.tplAbsent || "Teacher Absent Room {room} Period {period}"
  );
  const [tplAC, setTplAC] = useState(
    initTpl.tplAC || "AC Request Room {room} at {time}"
  );
  const [tplWashroom, setTplWashroom] = useState(
    initTpl.tplWashroom || "Washroom Alert Room {room} Gas:{gas}"
  );

  const parsedConfig = useMemo(() => parseConfig(config), [config]);

  if (config && config !== appliedConfig) {
    setAppliedConfig(config);
    const c = parsedConfig;
    if (c.hwEnabled !== undefined) setHardwareEnabled(c.hwEnabled === "true");
    if (c.gsmEnabled !== undefined) setGsmEnabled(c.gsmEnabled === "true");
    if (c.callEnabled !== undefined)
      setMissedCallEnabled(c.callEnabled === "true");
    if (c.phoneEmergency) setPhoneEmergency(c.phoneEmergency);
    if (c.phoneAbsent) setPhoneTeacherAbsent(c.phoneAbsent);
    if (c.phoneWashroom) setPhoneWashroom(c.phoneWashroom);
    if (c.phoneAC) setPhoneAC(c.phoneAC);
    if (c.periodDuration) setPeriodDuration(Number(c.periodDuration) || 60);
    if (c.graceDuration) setTeacherGrace(Number(c.graceDuration) || 10);
    if (c.emBuzzerDuration)
      setEmBuzzerDuration(Number(c.emBuzzerDuration) || 5);
    if (c.gasThreshold) setWashroomThreshold(Number(c.gasThreshold) || 2800);
    if (c.totalPeriods) setTotalPeriods(Number(c.totalPeriods) || 10);
    if (c.classroom) setClassroomNo(c.classroom);
    if (c.autoReboot !== undefined)
      setAutoRebootEnabled(c.autoReboot === "true");
    if (c.autoRebootH !== undefined && c.autoRebootM !== undefined) {
      const hh = String(c.autoRebootH).padStart(2, "0");
      const mm = String(c.autoRebootM).padStart(2, "0");
      setAutoRebootTime(`${hh}:${mm}`);
    }
  }

  const parsedTemplates = useMemo(
    () => parseSmsTemplates(smsTemplates),
    [smsTemplates]
  );

  if (smsTemplates && smsTemplates !== appliedTemplates) {
    setAppliedTemplates(smsTemplates);
    const t = parsedTemplates;
    if (t.tplEmergency) setTplEmergency(t.tplEmergency);
    if (t.tplAbsent) setTplAbsent(t.tplAbsent);
    if (t.tplAC) setTplAC(t.tplAC);
    if (t.tplWashroom) setTplWashroom(t.tplWashroom);
  }

  if (arduino && arduino !== prevArduino) {
    setPrevArduino(arduino);
    if (!userEditedTime) {
      const parsed = parseArduinoPayload(arduino);
      const deviceT = parsed.T;
      if (deviceT && /^\d{2}:\d{2}(:\d{2})?$/.test(deviceT)) {
        const hhmm = deviceT.slice(0, 5);
        setSystemTime(hhmm);
      }
    }
  }

  useEffect(() => {
    if (connected) {
      sendRawCommand("GET_CONFIG");
    }
  }, [connected, sendRawCommand]);

  const [saveStatus, setSaveStatus] = useState({});

  const handleSave = useCallback(
    async (key, cmd) => {
      if (!connected) return;
      setSaveStatus((s) => ({ ...s, [key]: "saving" }));
      try {
        await sendTrackedCommand(cmd);
        setSaveStatus((s) => ({ ...s, [key]: "saved" }));
        setTimeout(
          () =>
            setSaveStatus((s) =>
              s[key] === "saved" ? { ...s, [key]: "idle" } : s
            ),
          2500
        );
      } catch {
        setSaveStatus((s) => ({ ...s, [key]: "error" }));
        setTimeout(
          () =>
            setSaveStatus((s) =>
              s[key] === "error" ? { ...s, [key]: "idle" } : s
            ),
          3000
        );
      }
    },
    [connected, sendTrackedCommand]
  );

  const handleToggle = useCallback(
    async (cmd, newValue, setter) => {
      if (!connected) return;
      setter(newValue);
      try {
        await sendTrackedCommand(cmd);
      } catch {
        setter(!newValue);
      }
    },
    [connected, sendTrackedCommand]
  );

  const [pendingAction, setPendingAction] = useState(null);

  const send = useCallback(
    (cmd) => {
      if (!connected) return;
      sendRawCommand(cmd);
    },
    [connected, sendRawCommand]
  );

  const deviceOnline = connected && telemetryFresh;
  const noDevice = connected && !telemetryFresh;

  const deviceStatusLabel = !connected
    ? "Server Offline"
    : noDevice
      ? "No Device Connected"
      : "Device Online";

  const deviceStatusCls = !connected
    ? "bg-red-50 text-red-700 border-red-200/60 dark:bg-red-500/10 dark:text-red-400 dark:border-red-900/30"
    : noDevice
      ? "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-900/30"
      : "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-900/30";

  const deviceDotCls = !connected
    ? "bg-red-500"
    : noDevice
      ? "bg-amber-500 animate-pulse"
      : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse";

  return (
    <AnimatedPage className="pb-16 max-w-5xl mx-auto space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-surface-200/60 pb-6 dark:border-surface-800/60">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-surface-900 dark:text-white">
            Configuration
          </h1>
          <p className="mt-2 text-[15px] font-medium text-surface-500 dark:text-surface-400">
            Manage your hardware preferences, alerting thresholds, and system logic.
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 self-start rounded-full border px-3.5 py-1.5 text-[12px] font-bold shadow-sm ${deviceStatusCls}`}
        >
          <span className={`h-2 w-2 rounded-full ${deviceDotCls}`} />
          {deviceStatusLabel}
          {deviceId && deviceOnline && (
            <span className="ml-1 border-l border-current pl-2 font-mono opacity-60 mix-blend-multiply dark:mix-blend-screen">{deviceId}</span>
          )}
        </div>
      </div>

      {/* ── Not Connected Warning ── */}
      {!connected && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-white px-5 py-4 shadow-sm dark:border-amber-800/40 dark:from-amber-950/30 dark:to-surface-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-amber-900 dark:text-amber-300">
              WebSocket Disconnected
            </p>
            <p className="text-[13px] text-amber-700/80 dark:text-amber-400/80">
              Changes cannot be saved until the connection to the server is restored.
            </p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
         1️⃣ SYSTEM CONTROL
         ════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={Power}
        title="System Control"
        description="Toggle core hardware services on or off"
        accent="bg-gradient-to-br from-rose-500 to-red-600"
      >
        <SettingRow
          label="Hardware Service"
          description="Buttons, sensors, buzzer & LEDs — ESP32 stays connected when off"
        >
          <StatusBadge active={hardwareEnabled} />
          <Toggle
            enabled={hardwareEnabled}
            onChange={(v) =>
              handleToggle(v ? "HW_ENABLE" : "HW_DISABLE", v, setHardwareEnabled)
            }
            disabled={!connected}
          />
        </SettingRow>

        <SettingRow
          label="GSM Service"
          description="SIM800L modem for SMS & calls — WiFi and sensors stay active"
        >
          <StatusBadge active={gsmEnabled} />
          <Toggle
            enabled={gsmEnabled}
            onChange={(v) =>
              handleToggle(v ? "GSM_ENABLE" : "GSM_DISABLE", v, setGsmEnabled)
            }
            disabled={!connected}
          />
        </SettingRow>

        <SettingRow
          label="Missed Call Service"
          description="Ring admin number on emergency in addition to SMS"
        >
          <StatusBadge active={missedCallEnabled} />
          <Toggle
            enabled={missedCallEnabled}
            onChange={(v) =>
              handleToggle(
                v ? "CALL_ENABLE" : "CALL_DISABLE",
                v,
                setMissedCallEnabled
              )
            }
            disabled={!connected}
          />
        </SettingRow>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════
         2️⃣ PHONE NUMBERS
         ════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={Phone}
        title="Phone Numbers"
        description="SMS & call recipients — only 10-digit numbers allowed"
        accent="bg-gradient-to-br from-blue-500 to-indigo-600"
      >
        <SettingRow
          label="Emergency Number"
          description="Gas leak / emergency SMS & missed call recipient"
        >
          <div className="flex items-center gap-3">
            <PhoneInput
              value={phoneEmergency}
              onChange={setPhoneEmergency}
              disabled={!connected}
            />
            <ActionButton
              icon={Save}
              label={saveLabel(saveStatus.phoneEm)}
              small
              disabled={
                !connected ||
                phoneEmergency.length !== 10 ||
                saveStatus.phoneEm === "saving"
              }
              onClick={() =>
                handleSave("phoneEm", `SET_PHONE_EMERGENCY:${phoneEmergency}`)
              }
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Teacher Absent"
          description="SMS sent when teacher is absent beyond grace period"
        >
          <div className="flex items-center gap-3">
            <PhoneInput
              value={phoneTeacherAbsent}
              onChange={setPhoneTeacherAbsent}
              disabled={!connected}
            />
            <ActionButton
              icon={Save}
              label={saveLabel(saveStatus.phoneTa)}
              small
              disabled={
                !connected ||
                phoneTeacherAbsent.length !== 10 ||
                saveStatus.phoneTa === "saving"
              }
              onClick={() =>
                handleSave("phoneTa", `SET_PHONE_ABSENT:${phoneTeacherAbsent}`)
              }
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Washroom Alert"
          description="SMS sent when washroom sensor exceeds threshold"
        >
          <div className="flex items-center gap-3">
            <PhoneInput
              value={phoneWashroom}
              onChange={setPhoneWashroom}
              disabled={!connected}
            />
            <ActionButton
              icon={Save}
              label={saveLabel(saveStatus.phoneWr)}
              small
              disabled={
                !connected ||
                phoneWashroom.length !== 10 ||
                saveStatus.phoneWr === "saving"
              }
              onClick={() =>
                handleSave("phoneWr", `SET_PHONE_WASHROOM:${phoneWashroom}`)
              }
            />
          </div>
        </SettingRow>

        <SettingRow
          label="AC Request"
          description="SMS sent when students press the AC request button"
        >
          <div className="flex items-center gap-3">
            <PhoneInput
              value={phoneAC}
              onChange={setPhoneAC}
              disabled={!connected}
            />
            <ActionButton
              icon={Save}
              label={saveLabel(saveStatus.phoneAc)}
              small
              disabled={
                !connected ||
                phoneAC.length !== 10 ||
                saveStatus.phoneAc === "saving"
              }
              onClick={() => handleSave("phoneAc", `SET_PHONE_AC:${phoneAC}`)}
            />
          </div>
        </SettingRow>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════
         3️⃣ TIME SETTINGS
         ════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={Clock}
        title="Time Settings"
        description="System clock and automatic reboot schedule"
        accent="bg-gradient-to-br from-violet-500 to-purple-600"
      >
        <SettingRow
          label="System Time"
          description="Sync the ESP32 RTC clock (24-hour format) — time shown may differ from device current time"
        >
          <div className="flex items-center gap-3">
            <TimeInput
              value={systemTime}
              onChange={(v) => {
                setUserEditedTime(true);
                setSystemTime(v);
              }}
              disabled={!connected}
            />
            <ActionButton
              icon={Clock}
              label={
                saveStatus.time === "saving"
                  ? "Syncing…"
                  : saveStatus.time === "saved"
                    ? "Synced!"
                    : saveStatus.time === "error"
                      ? "Failed"
                      : "Sync"
              }
              small
              disabled={!connected || saveStatus.time === "saving"}
              onClick={() => {
                handleSave("time", `SET_TIME:${systemTime}`);
                setUserEditedTime(false);
              }}
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Auto Reboot"
          description="Enable daily scheduled restart to refresh hardware state"
        >
          <StatusBadge active={autoRebootEnabled} />
          <Toggle
            enabled={autoRebootEnabled}
            onChange={(v) =>
              handleToggle(
                v ? "AUTO_REBOOT_ENABLE" : "AUTO_REBOOT_DISABLE",
                v,
                setAutoRebootEnabled
              )
            }
            disabled={!connected}
          />
        </SettingRow>

        <SettingRow
          label="Auto Reboot Time"
          description="When the daily auto-reboot happens (24-hour format)"
        >
          <div className="flex items-center gap-3">
            <TimeInput
              value={autoRebootTime}
              onChange={setAutoRebootTime}
              disabled={!connected || !autoRebootEnabled}
            />
            <ActionButton
              icon={Save}
              label={saveLabel(saveStatus.rebootTime)}
              small
              disabled={
                !connected ||
                !autoRebootEnabled ||
                saveStatus.rebootTime === "saving"
              }
              onClick={() =>
                handleSave(
                  "rebootTime",
                  `SET_AUTO_REBOOT_TIME:${autoRebootTime}`
                )
              }
            />
          </div>
        </SettingRow>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════
         4️⃣ CLASSROOM CONFIGURATION
         ════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={Hash}
        title="Classroom Configuration"
        description="Room identity, period schedule, and attendance timing"
        accent="bg-gradient-to-br from-fuchsia-500 to-pink-600"
      >
        <SettingRow
          label="Classroom Number"
          description="Room identifier shown in SMS alerts and dashboard telemetry"
        >
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={classroomNo}
              disabled={!connected}
              maxLength={6}
              onChange={(e) =>
                setClassroomNo(e.target.value.replace(/\s/g, ""))
              }
              className="h-9 w-28 rounded-xl border border-surface-200 bg-surface-50 px-3 text-center text-[13px] font-black tabular-nums tracking-widest text-surface-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:focus:border-brand-500 dark:focus:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <ActionButton
              icon={Save}
              label={saveLabel(saveStatus.room)}
              small
              disabled={
                !connected || !classroomNo || saveStatus.room === "saving"
              }
              onClick={() => handleSave("room", `SET_CLASSROOM:${classroomNo}`)}
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Total Periods"
          description="Number of class periods per day (1–15)"
        >
          <div className="flex items-center gap-3">
            <NumberInput
              value={totalPeriods}
              onChange={setTotalPeriods}
              min={1}
              max={15}
              unit="periods"
              disabled={!connected}
            />
            <ActionButton
              icon={Save}
              label={saveLabel(saveStatus.periods)}
              small
              disabled={!connected || saveStatus.periods === "saving"}
              onClick={() =>
                handleSave("periods", `SET_TOTAL_PERIODS:${totalPeriods}`)
              }
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Period Duration"
          description="Length of each period in seconds (30–7200)"
        >
          <div className="flex items-center gap-3">
            <NumberInput
              value={periodDuration}
              onChange={setPeriodDuration}
              min={30}
              max={7200}
              unit="sec"
              disabled={!connected}
            />
            <ActionButton
              icon={Save}
              label={saveLabel(saveStatus.duration)}
              small
              disabled={!connected || saveStatus.duration === "saving"}
              onClick={() =>
                handleSave("duration", `SET_PERIOD_DURATION:${periodDuration}`)
              }
            />
          </div>
        </SettingRow>

        <SettingRow
          label="Teacher Grace Time"
          description="How many seconds teacher can arrive before marked absent (5–600)"
        >
          <div className="flex items-center gap-3">
            <NumberInput
              value={teacherGrace}
              onChange={setTeacherGrace}
              min={5}
              max={600}
              unit="sec"
              disabled={!connected}
            />
            <ActionButton
              icon={Save}
              label={saveLabel(saveStatus.grace)}
              small
              disabled={!connected || saveStatus.grace === "saving"}
              onClick={() =>
                handleSave("grace", `SET_GRACE_DURATION:${teacherGrace}`)
              }
            />
          </div>
        </SettingRow>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════
         5️⃣ SENSOR CONFIGURATION
         ════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={Wind}
        title="Sensor Configuration"
        description="Gas sensor trigger level for washroom alerts"
        accent="bg-gradient-to-br from-amber-500 to-orange-500"
      >
        <SettingRow
          label="Washroom Gas Threshold"
          description="Alert triggers when sensor value exceeds this number (500–5000)"
        >
          <div className="flex items-center gap-3">
            <NumberInput
              value={washroomThreshold}
              onChange={setWashroomThreshold}
              min={500}
              max={5000}
              step={100}
              unit="PPM"
              disabled={!connected}
            />
            <ActionButton
              icon={Save}
              label={saveLabel(saveStatus.washroom)}
              small
              disabled={!connected || saveStatus.washroom === "saving"}
              onClick={() =>
                handleSave("washroom", `SET_GAS_THRESHOLD:${washroomThreshold}`)
              }
            />
          </div>
        </SettingRow>
        <SettingRow
          label="Emergency Buzzer Duration"
          description="How long the buzzer sounds during an emergency (1–120 seconds)"
        >
          <div className="flex items-center gap-3">
            <NumberInput
              value={emBuzzerDuration}
              onChange={setEmBuzzerDuration}
              min={1}
              max={120}
              unit="sec"
              disabled={!connected}
            />
            <ActionButton
              icon={Save}
              label={saveLabel(saveStatus.emBuzz)}
              small
              disabled={!connected || saveStatus.emBuzz === "saving"}
              onClick={() =>
                handleSave(
                  "emBuzz",
                  `SET_EM_BUZZER_DURATION:${emBuzzerDuration}`
                )
              }
            />
          </div>
        </SettingRow>
      </SectionCard>

      {/* ════════════════════════════════════════════════════════
         7️⃣ SMS TEMPLATES
         ════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={MessageSquare}
        title="SMS Templates"
        description="Customise alert messages — use placeholders for dynamic values"
        accent="bg-gradient-to-br from-cyan-500 to-blue-500"
      >
        <TemplateEditor
          label="Emergency Alert"
          description="Sent when gas leaks or emergency is triggered"
          value={tplEmergency}
          onChange={setTplEmergency}
          saveStatus={saveStatus.tplEm}
          disabled={!connected}
          onSave={() =>
            handleSave("tplEm", `SET_SMS_TPL_EMERGENCY:${tplEmergency}`)
          }
        />
        <TemplateEditor
          label="Teacher Absent"
          description="Sent when teacher is absent beyond grace period"
          value={tplAbsent}
          onChange={setTplAbsent}
          saveStatus={saveStatus.tplAb}
          disabled={!connected}
          onSave={() => handleSave("tplAb", `SET_SMS_TPL_ABSENT:${tplAbsent}`)}
        />
        <TemplateEditor
          label="AC Request"
          description="Sent when students press the AC request button"
          value={tplAC}
          onChange={setTplAC}
          saveStatus={saveStatus.tplAc}
          disabled={!connected}
          onSave={() => handleSave("tplAc", `SET_SMS_TPL_AC:${tplAC}`)}
        />
        <TemplateEditor
          label="Washroom / Gas Alert"
          description="Sent when gas sensor exceeds the threshold"
          value={tplWashroom}
          onChange={setTplWashroom}
          saveStatus={saveStatus.tplWr}
          disabled={!connected}
          onSave={() =>
            handleSave("tplWr", `SET_SMS_TPL_WASHROOM:${tplWashroom}`)
          }
        />
      </SectionCard>

      {/* ════════════════════════════════════════════════════════
         8️⃣ DEVICE ACTIONS (Danger Zone)
         ════════════════════════════════════════════════════════ */}
      <div className="pt-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-red-200 dark:to-red-900/50" />
          <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-red-500">
            <AlertTriangle size={14} />
            Danger Zone
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-red-200 dark:to-red-900/50" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-red-200 bg-red-50/30 shadow-sm dark:border-red-900/40 dark:bg-red-950/10">
          <SettingRow
            label="Restart Device"
            description="Soft-reboot the ESP32 — reconnects automatically within seconds"
          >
            <ActionButton
              icon={RotateCcw}
              label="Restart"
              variant="warning"
              disabled={!connected}
              onClick={() =>
                setPendingAction({
                  title: "Restart Device",
                  description:
                    "The ESP32 will soft-reboot and reconnect automatically.",
                  confirmLabel: "Restart",
                  variant: "warning",
                  action: () => send("DEVICE_RESTART"),
                })
              }
            />
          </SettingRow>

          <SettingRow
            label="Factory Reset"
            description="Reset ALL settings to firmware defaults — this cannot be undone"
          >
            <ActionButton
              icon={Zap}
              label="Factory Reset"
              variant="danger"
              disabled={!connected}
              onClick={() =>
                setPendingAction({
                  title: "Factory Reset",
                  description:
                    "All custom settings will be erased and firmware defaults restored. The device will restart.",
                  confirmLabel: "Factory Reset",
                  variant: "danger",
                  action: () => send("DEVICE_FACTORY_RESET"),
                })
              }
            />
          </SettingRow>
        </div>
      </div>

      {/* ── Footer spacer ── */}
      <div className="pt-8 text-center">
        <p className="text-[12px] font-medium text-surface-400 dark:text-surface-600">
          EduGuard Configuration
          {deviceId && <span className="mx-2 tracking-widest opacity-50">&middot;</span>}
          {deviceId && <span className="font-mono opacity-70">{deviceId}</span>}
        </p>
      </div>

      {/* ═══ Password Confirm Modal for critical actions ═══ */}
      <PasswordConfirmModal
        open={!!pendingAction}
        title={pendingAction?.title ?? "Confirm Action"}
        description={
          pendingAction?.description ?? "Enter your password to continue."
        }
        confirmLabel={pendingAction?.confirmLabel ?? "Confirm"}
        variant={pendingAction?.variant ?? "danger"}
        onConfirm={() => pendingAction?.action?.()}
        onCancel={() => setPendingAction(null)}
      />
    </AnimatedPage>
  );
}
