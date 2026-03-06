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
    <div className="overflow-hidden rounded-xl border border-surface-200/80 bg-white dark:border-surface-800 dark:bg-surface-900">
      <div className="flex items-center gap-3 border-b border-surface-100 bg-surface-50/60 px-6 py-4 dark:border-surface-800 dark:bg-surface-800/30">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
        >
          <Icon size={15} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white">
            {title}
          </h3>
          {description && (
            <p className="text-[11px] text-surface-400">{description}</p>
          )}
        </div>
      </div>
      <div className="divide-y divide-surface-100 dark:divide-surface-800/60">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-surface-800 dark:text-surface-100">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-[11px] leading-relaxed text-surface-400">
            {description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
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
      className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-surface-900 ${
        enabled
          ? "border-brand-500 bg-brand-500"
          : "border-surface-300 bg-surface-200 dark:border-surface-600 dark:bg-surface-700"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
          enabled ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function NumberInput({ value, onChange, min, max, step = 1, unit, disabled }) {
  /* Keep a local string so the user can clear the field while typing.
     The numeric value is only committed on blur. */
  const [draft, setDraft] = useState(() => String(value));
  const [committed, setCommitted] = useState(value);

  /* Adjust state during render when the external value changes
     (e.g. config sync). Uses state — not refs — so React 19 is happy. */
  if (value !== committed) {
    setCommitted(value);
    setDraft(String(value));
  }

  return (
    <div className="flex items-center gap-2">
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
            /* Revert to last committed value if user left it empty */
            setDraft(String(committed));
          } else {
            setCommitted(v);
            onChange(v);
          }
        }}
        className="h-9 w-24 rounded-lg border border-surface-200 bg-surface-50 px-3 text-sm font-semibold tabular-nums text-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 disabled:opacity-50"
      />
      {unit && (
        <span className="text-xs font-semibold text-surface-400">{unit}</span>
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
      className="h-9 w-40 rounded-lg border border-surface-200 bg-surface-50 px-3 text-sm font-mono font-semibold tabular-nums text-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 disabled:opacity-50"
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
      className="h-9 rounded-lg border border-surface-200 bg-surface-50 px-3 text-sm font-semibold text-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 disabled:opacity-50"
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
  const base = small ? "px-2.5 py-1 text-[12px]" : "px-3.5 py-2 text-sm";
  const variants = {
    primary:
      "border border-brand-500 bg-brand-500 text-white hover:bg-brand-600 hover:border-brand-600 focus:ring-brand-500",
    danger:
      "border border-red-500 bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
    warning:
      "border border-amber-500 bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500",
    secondary:
      "border border-surface-200 bg-white text-surface-700 hover:bg-surface-50 focus:ring-surface-400 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-surface-900 disabled:cursor-not-allowed disabled:opacity-50 ${base} ${variants[variant]}`}
    >
      {Icon && <Icon size={small ? 12 : 14} />}
      {label}
    </button>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${
        active
          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          : "bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-surface-400"
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
    <div className="space-y-3 px-6 py-4">
      {/* Header */}
      <div>
        <p className="text-sm font-semibold text-surface-800 dark:text-surface-100">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-xs text-surface-400">{description}</p>
        )}
      </div>

      {/* Placeholder Buttons */}
      <div className="flex flex-wrap gap-1.5">
        {SMS_PLACEHOLDERS.map(({ tag, label: lbl }) => (
          <button
            key={tag}
            type="button"
            disabled={disabled}
            onClick={() => insertPlaceholder(tag)}
            className="inline-flex items-center gap-1 rounded-md border border-surface-200 bg-surface-50 px-2 py-1 text-[11px] font-bold text-surface-600 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:border-brand-500 dark:hover:bg-brand-900/30 dark:hover:text-brand-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="font-mono">{tag}</span>
            <span className="text-[10px] font-medium text-surface-400">
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
          className="w-full resize-none rounded-lg border border-surface-200 bg-surface-50 px-3 py-2.5 font-mono text-sm text-surface-800 outline-none transition-colors placeholder:text-surface-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-600 disabled:opacity-50"
        />
        <span
          className={`absolute bottom-2 right-3 text-[10px] font-bold tabular-nums ${
            overLimit
              ? "text-red-500"
              : charCount > 140
                ? "text-amber-500"
                : "text-surface-300 dark:text-surface-600"
          }`}
        >
          {charCount}/160
        </span>
      </div>

      {/* Live Preview */}
      {value && (
        <div className="rounded-lg border border-dashed border-surface-200 bg-surface-50/50 px-3 py-2 dark:border-surface-700 dark:bg-surface-800/50">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-surface-400">
            Preview
          </p>
          <p className="font-mono text-xs leading-relaxed text-surface-700 dark:text-surface-200">
            {preview}
          </p>
        </div>
      )}

      {/* Save */}
      <div className="flex justify-end">
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

  /* ── Debounce "connected" so brief WS reconnects don't flash offline ── */
  const wsConnectedNow = wsStatus === "connected";
  const [connected, setConnected] = useState(wsConnectedNow);
  const offlineTimerRef = useRef(null);

  useEffect(() => {
    if (wsConnectedNow) {
      /* Immediately show connected — wrapped in setTimeout to satisfy eslint */
      clearTimeout(offlineTimerRef.current);
      setTimeout(() => setConnected(true), 0);
    } else {
      /* Delay showing offline by 1.5 s to absorb brief reconnects */
      offlineTimerRef.current = setTimeout(() => setConnected(false), 1500);
    }
    return () => clearTimeout(offlineTimerRef.current);
  }, [wsConnectedNow]);

  const [appliedConfig, setAppliedConfig] = useState("");
  const [appliedTemplates, setAppliedTemplates] = useState("");
  const [prevArduino, setPrevArduino] = useState(arduino);
  const [userEditedTime, setUserEditedTime] = useState(false);

  /* ── Parse initial config/templates from TelemetryContext on first mount.
       This ensures the UI shows the ACTUAL device values from the very first
       render, eliminating the flash-of-defaults that caused settings to
       appear reverted after page navigation. ── */
  const [initCfg] = useState(() => parseConfig(config));
  const [initTpl] = useState(() => parseSmsTemplates(smsTemplates));

  /* ── State initialised from device config (falls back to firmware defaults) ── */

  // 1. Hardware Service
  const [hardwareEnabled, setHardwareEnabled] = useState(
    initCfg.hwEnabled !== undefined ? initCfg.hwEnabled === "true" : true
  );

  // 2. GSM Service
  const [gsmEnabled, setGsmEnabled] = useState(
    initCfg.gsmEnabled !== undefined ? initCfg.gsmEnabled === "true" : true
  );

  // 3. Phone Numbers
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

  // 4. System Time — defaults to empty; synced from device telemetry
  const [systemTime, setSystemTime] = useState("");

  // 5. Number of Periods
  const [totalPeriods, setTotalPeriods] = useState(
    Number(initCfg.totalPeriods) || 10
  );

  // 6. Period Duration
  const [periodDuration, setPeriodDuration] = useState(
    Number(initCfg.periodDuration) || 60
  );

  // 7. Washroom Sensor Threshold
  const [washroomThreshold, setWashroomThreshold] = useState(
    Number(initCfg.gasThreshold) || 2800
  );

  // 8. Teacher Grace Duration
  const [teacherGrace, setTeacherGrace] = useState(
    Number(initCfg.graceDuration) || 10
  );

  // 9. Missed Call
  const [missedCallEnabled, setMissedCallEnabled] = useState(
    initCfg.callEnabled !== undefined ? initCfg.callEnabled === "true" : true
  );

  // 11. Emergency Buzzer Duration
  const [emBuzzerDuration, setEmBuzzerDuration] = useState(
    Number(initCfg.emBuzzerDuration) || 5
  );

  // 12. Classroom Number
  const [classroomNo, setClassroomNo] = useState(initCfg.classroom || "706");

  // 16. Auto Reboot
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

  // 17. SMS Templates
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

  /* ── Sync state from device config telemetry ── */
  const parsedConfig = useMemo(() => parseConfig(config), [config]);

  /* Adjust state during render when new config arrives from device.
     Avoids useEffect to prevent cascading-render warnings. */
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

  /* ── Sync SMS templates from device telemetry ── */
  const parsedTemplates = useMemo(
    () => parseSmsTemplates(smsTemplates),
    [smsTemplates]
  );

  /* Adjust SMS template state during render when new templates arrive. */
  if (smsTemplates && smsTemplates !== appliedTemplates) {
    setAppliedTemplates(smsTemplates);
    const t = parsedTemplates;
    if (t.tplEmergency) setTplEmergency(t.tplEmergency);
    if (t.tplAbsent) setTplAbsent(t.tplAbsent);
    if (t.tplAC) setTplAC(t.tplAC);
    if (t.tplWashroom) setTplWashroom(t.tplWashroom);
  }

  /* Sync system time from live arduino telemetry during render. */
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

  /* ── Request config from device on connect ── */
  useEffect(() => {
    if (connected) {
      sendRawCommand("GET_CONFIG");
    }
  }, [connected, sendRawCommand]);

  /* ── Save status tracking per field: idle | saving | saved | error ── */
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

  /* ── Pending critical action (password-gated) ── */
  const [pendingAction, setPendingAction] = useState(null);

  /* ── Fire-and-forget for danger actions (restart / factory reset) ── */
  const send = useCallback(
    (cmd) => {
      if (!connected) return;
      sendRawCommand(cmd);
    },
    [connected, sendRawCommand]
  );

  /* Three-state device status:
     - Device Online  : WS connected AND ESP32 sending telemetry
     - No Device      : WS connected to server but ESP32 not sending data
     - Server Offline : WS not connected at all
  */
  const deviceOnline = connected && telemetryFresh;
  const noDevice = connected && !telemetryFresh;

  const deviceStatusLabel = !connected
    ? "Server Offline"
    : noDevice
      ? "No Device"
      : "Device Online";
  const deviceStatusCls = !connected
    ? "border-red-200 bg-red-50 text-red-600 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-400"
    : noDevice
      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400"
      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400";
  const deviceDotCls = !connected
    ? "bg-red-500"
    : noDevice
      ? "bg-amber-500 animate-pulse"
      : "bg-emerald-500 animate-pulse";

  return (
    <AnimatedPage className="pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white">
            Device Settings
          </h1>
          <p className="mt-1 text-sm text-surface-500">
            Configure ESP32 hardware, sensors, alerts and system parameters.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 self-start rounded-lg border px-3 py-1.5 text-[11px] font-semibold ${deviceStatusCls}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${deviceDotCls}`} />
          {deviceStatusLabel}
          {deviceId && deviceOnline && (
            <span className="ml-1 font-mono opacity-60">{deviceId}</span>
          )}
        </span>
      </div>

      {/* ── Not Connected Warning ── */}
      {!connected && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/20">
          <AlertTriangle
            size={15}
            className="shrink-0 text-amber-600 dark:text-amber-400"
          />
          <p className="text-[13px] font-medium text-amber-700 dark:text-amber-300">
            Device offline. Connect the ESP32 to make changes.
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
         1️⃣ SYSTEM CONTROL
         ════════════════════════════════════════════════════════ */}
      <SectionCard
        icon={Power}
        title="System Control"
        description="Toggle core hardware services on or off"
        accent="bg-rose-500"
      >
        <SettingRow
          label="Hardware Service"
          description="Buttons, sensors, buzzer & LEDs — ESP32 stays connected when off"
        >
          <StatusBadge active={hardwareEnabled} />
          <Toggle
            enabled={hardwareEnabled}
            onChange={(v) =>
              handleToggle(
                v ? "HW_ENABLE" : "HW_DISABLE",
                v,
                setHardwareEnabled
              )
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
        accent="bg-blue-500"
      >
        <SettingRow
          label="Emergency Number"
          description="Gas leak / emergency SMS & missed call recipient"
        >
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
        accent="bg-violet-500"
      >
        <SettingRow
          label="System Time"
          description="Sync the ESP32 RTC clock (24-hour format) — time shown may differ from device current time"
        >
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
        accent="bg-indigo-500"
      >
        <SettingRow
          label="Classroom Number"
          description="Room identifier shown in SMS alerts and dashboard telemetry"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={classroomNo}
              disabled={!connected}
              maxLength={6}
              onChange={(e) =>
                setClassroomNo(e.target.value.replace(/\s/g, ""))
              }
              className="h-9 w-24 rounded-lg border border-surface-200 bg-surface-50 px-3 text-center text-sm font-bold tabular-nums text-surface-800 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 disabled:opacity-50"
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
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
        accent="bg-amber-500"
      >
        <SettingRow
          label="Washroom Gas Threshold"
          description="Alert triggers when sensor value exceeds this number (500–5000)"
        >
          <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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
        accent="bg-cyan-500"
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
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-surface-200 dark:bg-surface-800" />
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-500">
          <AlertTriangle size={10} />
          Danger Zone
        </span>
        <div className="h-px flex-1 bg-surface-200 dark:bg-surface-800" />
      </div>
      <SectionCard
        icon={AlertTriangle}
        title="Device Actions"
        description="Restart or factory-reset the device. Requires password confirmation."
        accent="bg-red-500"
      >
        <SettingRow
          label="Restart Device"
          description="Soft-reboot the ESP32 — reconnects automatically within seconds"
        >
          <ActionButton
            icon={RotateCcw}
            label="Restart"
            variant="danger"
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
      </SectionCard>

      {/* ── Footer spacer ── */}
      <div className="pt-2 text-center text-[11px] text-surface-300 dark:text-surface-700">
        EduGuard &middot; Device Settings{deviceId ? ` · ${deviceId}` : ""}
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
