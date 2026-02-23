import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ================================================================
   EduGuard Enterprise Dashboard
   ----------------------------------------------------------------
   - Auto-reconnect WebSocket with exponential back-off
   - Category-based telemetry rendering (arduino / wifi / gsm / esp)
   - Two-way control with anti-spam guard
   - localStorage persistence of last-known telemetry
   - Device online / offline indicator
   ================================================================ */

const STORAGE_KEY = "eduguard_telemetry";
const RECONNECT_BASE = 1000; // 1 s
const RECONNECT_MAX = 16000; // 16 s cap

/* ── label prettifier ──────────────────────────────────────── */

const LABELS = {
  class: "Class",
  P: "Period",
  PT: "Period Time",
  TP: "Teacher Present",
  AC: "AC",
  EM: "Emergency",
  GS: "Gas",
  T: "Time",
  isSystemActive: "System Active",
  isPresent: "Present",
  isTeacherAbsent: "Teacher Absent",
  isACReq: "AC Request",
  isEmergencyReq: "Emergency Req",
  isWashroomDirty: "Washroom Dirty",
  rssi: "RSSI",
  ip: "IP Address",
  reconnects: "Reconnects",
  uptime: "Uptime (s)",
  signal: "Signal",
  operator: "Operator",
  battery: "Battery",
  reg: "Registration",
  imei: "IMEI",
  iccid: "ICCID",
  heap: "Free Heap",
  cpuMHz: "CPU MHz",
  flashKB: "Flash (KB)",
  resetReason: "Reset Reason",
  status: "Status",
};

function toLabel(key) {
  return LABELS[key] || key;
}

/* ── parse "key=val,key=val" or "key:val,key:val" strings ── */

function parseLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed || trimmed.startsWith("Waiting")) return [];

  return trimmed
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      if (eq !== -1) {
        let rawKey = part.slice(0, eq).trim();
        // Strip leading prefix like "wifi:" or "gsm:"
        const colon = rawKey.indexOf(":");
        if (colon !== -1) rawKey = rawKey.slice(colon + 1);
        return { key: rawKey, value: part.slice(eq + 1).trim() };
      }
      const col = part.indexOf(":");
      if (col !== -1) {
        return {
          key: part.slice(0, col).trim(),
          value: part.slice(col + 1).trim(),
        };
      }
      return { key: part, value: "" };
    });
}

/* ── DataCard component ────────────────────────────────────── */

function DataCard({ title, line, accent }) {
  const items = parseLine(line);

  return (
    <div
      className={`rounded-lg border bg-white p-4 shadow-sm dark:bg-surface-900 ${
        accent
          ? "border-primary-300 dark:border-primary-700"
          : "border-surface-200 dark:border-surface-700"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-surface-500">
        {title}
      </p>

      {items.length === 0 ? (
        <p className="mt-2 text-sm italic text-surface-400">{line}</p>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {items.map((item, i) => (
            <div
              key={`${item.key}-${i}`}
              className="rounded border border-surface-100 bg-surface-50 px-2 py-1 text-sm dark:border-surface-700 dark:bg-surface-800"
            >
              <p className="text-[10px] uppercase text-surface-400">
                {toLabel(item.key)}
              </p>
              <p className="font-semibold text-surface-900 dark:text-surface-100">
                {item.value || "–"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Status badge ──────────────────────────────────────────── */

function StatusBadge({ status }) {
  const colours = {
    Connected: "bg-green-500",
    Connecting: "bg-yellow-500 animate-pulse",
    Disconnected: "bg-red-500",
    Error: "bg-red-600",
  };

  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-surface-700 dark:text-surface-200">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${colours[status] || "bg-gray-400"}`}
      />
      {status}
    </span>
  );
}

/* ── load / save helpers ───────────────────────────────────── */

function loadCached() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCached(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota exceeded — ignore */
  }
}

/* ================================================================
   Main Component
   ================================================================ */

export default function DashboardHome() {
  const cached = useMemo(() => loadCached(), []);

  const [arduino, setArduino] = useState(
    cached?.arduino || "Waiting for Arduino telemetry…"
  );
  const [wifi, setWifi] = useState(cached?.wifi || "Waiting for WiFi health…");
  const [gsm, setGsm] = useState(cached?.gsm || "Waiting for GSM health…");
  const [esp, setEsp] = useState(cached?.esp || "Waiting for ESP32 system…");
  const [live, setLive] = useState(
    cached?.live || "Waiting for live telemetry…"
  );

  const [wsStatus, setWsStatus] = useState("Connecting");
  const [deviceOnline, setDeviceOnline] = useState(false);
  const [cmdStatus, setCmdStatus] = useState("No command sent yet.");
  const [pendingCmd, setPendingCmd] = useState(null);

  const wsRef = useRef(null);

  const wsUrl = useMemo(() => {
    const host = window.location.hostname || "localhost";
    return `ws://${host}:8080`;
  }, []);

  /* ── persist last telemetry ──────────────────────────── */

  useEffect(() => {
    saveCached({ arduino, wifi, gsm, esp, live });
  }, [arduino, wifi, gsm, esp, live]);

  /* ── apply incoming payload by category ─────────────── */

  const applyPayload = useCallback((payload, category) => {
    setLive(payload);

    switch (category) {
      case "arduino":
        setArduino(payload);
        break;
      case "wifi":
        setWifi(payload);
        break;
      case "gsm":
        setGsm(payload);
        break;
      case "esp":
        setEsp(payload);
        break;
      default:
        /* Legacy: infer from prefix */
        if (payload.startsWith("class:")) setArduino(payload);
        else if (payload.startsWith("wifi:")) setWifi(payload);
        else if (payload.startsWith("gsm:")) setGsm(payload);
        else if (payload.startsWith("esp:")) setEsp(payload);
        break;
    }
  }, []);

  /* ── WebSocket lifecycle with auto-reconnect ────────── */

  useEffect(() => {
    let mounted = true;
    let ws = null;
    let retryDelay = RECONNECT_BASE;
    let retryTimer = null;

    function openSocket() {
      if (!mounted) return;

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setWsStatus("Connecting");

      ws.onopen = () => {
        if (!mounted) {
          ws.close();
          return;
        }
        setWsStatus("Connected");
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
            applyPayload(String(data.payload || ""), data.category || "");
            break;
          case "control_status":
            if (data.status === "sent") {
              setCmdStatus(`${data.command} sent → waiting for device ack…`);
            } else {
              setCmdStatus(`${data.command} failed — device offline.`);
              setPendingCmd(null);
            }
            break;
          case "control_ack":
            setCmdStatus(`✓ ${data.command} executed by ${data.device}`);
            setPendingCmd(null);
            break;
          case "device_status":
            setDeviceOnline(data.online);
            break;
          default:
            break;
        }
      };

      ws.onerror = () => {
        if (!mounted) return;
        setWsStatus("Error");
      };

      ws.onclose = () => {
        if (!mounted) return;
        setWsStatus("Disconnected");
        wsRef.current = null;
        // Auto-reconnect with exponential back-off
        retryTimer = setTimeout(openSocket, retryDelay);
        retryDelay = Math.min(retryDelay * 2, RECONNECT_MAX);
      };
    }

    openSocket();

    return () => {
      mounted = false;
      clearTimeout(retryTimer);
      if (ws) {
        ws.onclose = null; // prevent reconnect from cleanup close
        ws.close();
      }
      wsRef.current = null;
    };
  }, [wsUrl, applyPayload]);

  /* ── send control command (with anti-spam) ───────────── */

  const sendCommand = useCallback(
    (cmd) => {
      if (pendingCmd) {
        setCmdStatus(`Please wait — ${pendingCmd} still pending…`);
        return;
      }
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setCmdStatus(`Cannot send ${cmd}: not connected.`);
        return;
      }

      setPendingCmd(cmd);
      setCmdStatus(`Sending ${cmd}…`);

      wsRef.current.send(
        JSON.stringify({
          type: "control",
          device: "CLASSROOM-706",
          command: cmd,
        })
      );

      // Auto-clear pending after 8 s safety net
      setTimeout(() => setPendingCmd((p) => (p === cmd ? null : p)), 8000);
    },
    [pendingCmd]
  );

  /* ── control buttons config ──────────────────────────── */

  const buttons = [
    {
      cmd: "AC_REQUEST",
      label: "AC Request",
      colour: "bg-blue-600 hover:bg-blue-500",
    },
    {
      cmd: "EMERGENCY_REQ",
      label: "Emergency",
      colour: "bg-red-600 hover:bg-red-500",
    },
    {
      cmd: "WASHROOM_REQUEST",
      label: "Washroom",
      colour: "bg-amber-600 hover:bg-amber-500",
    },
    {
      cmd: "TEACHER_FORCE_PRESENT",
      label: "Mark Teacher Present",
      colour: "bg-emerald-600 hover:bg-emerald-500",
    },
  ];

  /* ── render ──────────────────────────────────────────── */

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">
          Classroom 706 — Live Dashboard
        </h2>
        <div className="flex items-center gap-4">
          <StatusBadge status={wsStatus} />
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              deviceOnline
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            Device {deviceOnline ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* Command status bar */}
      <div className="rounded-md border border-surface-200 bg-surface-50 px-4 py-2 text-sm dark:border-surface-700 dark:bg-surface-800">
        <span className="font-medium text-surface-600 dark:text-surface-300">
          Command:
        </span>{" "}
        <span className="text-surface-800 dark:text-surface-100">
          {cmdStatus}
        </span>
      </div>

      {/* Telemetry cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <DataCard title="Arduino Telemetry" line={arduino} accent />
        <DataCard title="WiFi Health" line={wifi} />
        <DataCard title="GSM Health" line={gsm} />
        <DataCard title="ESP32 System" line={esp} />
        <DataCard title="Live Payload" line={live} />
      </div>

      {/* Control buttons */}
      <div className="flex flex-wrap gap-3">
        {buttons.map(({ cmd, label, colour }) => (
          <button
            key={cmd}
            disabled={pendingCmd !== null}
            className={`rounded-md px-5 py-2 text-sm font-semibold text-white shadow transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${colour}`}
            onClick={() => sendCommand(cmd)}
          >
            {pendingCmd === cmd ? `${label}…` : label}
          </button>
        ))}
      </div>
    </div>
  );
}
