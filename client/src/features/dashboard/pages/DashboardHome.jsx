import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  Droplets,
  Router,
  Server,
  ShieldAlert,
  Signal,
  Thermometer,
  Users,
  Wifi,
  Wind,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ================================================================
   EduGuard Enterprise Dashboard - Premium Edition
   ----------------------------------------------------------------
   - Auto-reconnect WebSocket with exponential back-off
   - Advanced Payload Parser (fixes comma-separated hardware values)
   - Professional Grade UI with live-pulsing alerts
   - Automatic null-fallbacks to prevent dummy/zero data
   ================================================================ */

const STORAGE_KEY = "eduguard_telemetry";
const RECONNECT_BASE = 1000;
const RECONNECT_MAX = 16000;

/* ── Advanced Parser: Fixes battery/signal comma fragmentation ── */
function parseToObject(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed || trimmed.startsWith("Waiting")) return {};

  const obj = {};
  let lastKey = null;

  trimmed.split(",").forEach((part) => {
    const p = part.trim();
    if (!p) return;

    if (p.includes("=")) {
      const splitIdx = p.indexOf("=");
      let rawKey = p.slice(0, splitIdx).trim();
      if (rawKey.includes(":")) rawKey = rawKey.split(":")[1]; // strip prefixes

      lastKey = rawKey;
      obj[lastKey] = p.slice(splitIdx + 1).trim();
    } else if (p.includes(":")) {
      const splitIdx = p.indexOf(":");
      lastKey = p.slice(0, splitIdx).trim();
      obj[lastKey] = p.slice(splitIdx + 1).trim();
    } else if (lastKey) {
      // Re-attach values that were accidentally split by commas (like battery: 0,100,4100)
      obj[lastKey] += `, ${p}`;
    }
  });

  return obj;
}

/* ── Time Formatter ── */
function formatUptime(seconds) {
  if (!seconds || isNaN(seconds)) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

/* ── UI Helpers ────────────────────────────────────────────── */

const StatusBadge = ({ active, label, dangerMode = false }) => {
  if (active === undefined || active === "") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
        <Clock size={12} /> Waiting...
      </div>
    );
  }

  const isTrue = active === "true" || active === "1" || active === true;

  if (dangerMode && isTrue) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-300 bg-red-100 text-red-700 text-[11px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.4)] animate-pulse">
        <AlertTriangle size={12} strokeWidth={3} /> {label}
      </div>
    );
  }

  const colorClass = isTrue
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-slate-100 text-slate-500 border-slate-200";

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-colors ${colorClass}`}
    >
      {isTrue ? (
        <CheckCircle2 size={12} strokeWidth={3} />
      ) : (
        <XCircle size={12} strokeWidth={3} />
      )}
      {label}
    </div>
  );
};

const MetricBox = ({ label, value, icon: Icon, unit = "" }) => {
  const displayValue =
    value === undefined || value === "" || value === "N/A"
      ? "—"
      : `${value}${unit}`;

  return (
    <div className="flex flex-col p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1.5">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {label}
      </span>
      <span
        className={`text-base font-bold ${displayValue === "—" ? "text-slate-300" : "text-slate-800 dark:text-slate-100"}`}
      >
        {displayValue}
      </span>
    </div>
  );
};

/* ── Component 1: Arduino Live Data ────────────────────────── */

function ArduinoWidget({ dataString }) {
  const data = useMemo(() => parseToObject(dataString), [dataString]);
  const isWaiting = Object.keys(data).length === 0;

  return (
    <div className="col-span-1 xl:col-span-2 rounded-2xl border border-blue-100 dark:border-blue-900 bg-slate-50 dark:bg-slate-900 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 flex justify-between items-center">
        <h3 className="text-white font-semibold flex items-center gap-2 text-lg">
          <Activity size={20} className="text-blue-200" /> Live Classroom
          Telemetry
        </h3>
        <StatusBadge active={data.isSystemActive} label="System Active" />
      </div>

      {isWaiting ? (
        <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
          <Activity className="animate-pulse" size={32} />
          <p className="text-sm font-medium">Awaiting sensor data stream...</p>
        </div>
      ) : (
        <div className="p-6">
          <div className="flex flex-wrap gap-3 mb-6 pb-6 border-b border-slate-200 dark:border-slate-800">
            <StatusBadge
              active={data.isACReq}
              label="AC Request"
              dangerMode={true}
            />
            <StatusBadge
              active={data.isEmergencyReq}
              label="Emergency"
              dangerMode={true}
            />
            <StatusBadge
              active={data.isWashroomDirty}
              label="Washroom Alert"
              dangerMode={true}
            />
            <StatusBadge
              active={data.isTeacherAbsent}
              label="Teacher Absent"
              dangerMode={true}
            />
            <StatusBadge active={data.isPresent} label="Class Occupied" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricBox icon={Users} label="Classroom" value={data.class} />
            <MetricBox icon={Clock} label="Period" value={data.P} />
            <MetricBox
              icon={Activity}
              label="Gas Level"
              value={data.GS}
              unit=" ppm"
            />
            <MetricBox icon={Clock} label="System Time" value={data.T} />
            <MetricBox label="Period Duration" value={data.PT} />
            <MetricBox label="Teacher Present (Raw)" value={data.TP} />
            <MetricBox label="AC State" value={data.AC} />
            <MetricBox label="Emergency State" value={data.EM} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Component 2: GSM Network Data ─────────────────────────── */

function GsmWidget({ dataString }) {
  const data = useMemo(() => parseToObject(dataString), [dataString]);
  const isWaiting = Object.keys(data).length === 0;

  // Clean up battery display (e.g., "0, 98, 4100" -> "98% (4.1V)")
  let batDisplay = data.battery;
  if (batDisplay && batDisplay.includes(",")) {
    const parts = batDisplay.split(",");
    if (parts.length >= 3) {
      batDisplay = `${parts[1].trim()}% (${(parseInt(parts[2].trim()) / 1000).toFixed(1)}V)`;
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-lg overflow-hidden flex flex-col">
      <div className="bg-white dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <h3 className="text-slate-800 dark:text-white font-semibold flex items-center gap-2">
          <Signal size={18} className="text-emerald-500" /> Cellular Network
        </h3>
        <StatusBadge active={data.gsmReady} label="SIM Ready" />
      </div>

      <div className="p-6 flex-1">
        {isWaiting ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 min-h-[150px]">
            <Signal className="animate-pulse" size={24} />
            <p className="text-sm">Connecting to cell tower...</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <MetricBox
                icon={Signal}
                label="Signal Quality"
                value={data.signal}
              />
              <MetricBox icon={Router} label="Network Mode" value={data.net} />
              <MetricBox icon={Zap} label="Module Battery" value={batDisplay} />
              <MetricBox icon={Server} label="Operator" value={data.operator} />
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-center px-4 py-2.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  IMEI
                </span>
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                  {data.imei || "—"}
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-2.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  ICCID
                </span>
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                  {data.iccid || "—"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Component 3: System & WiFi Data (ESP32) ───────────────── */

function SystemWidget({ wifiString, espString }) {
  const wifi = useMemo(() => parseToObject(wifiString), [wifiString]);
  const esp = useMemo(() => parseToObject(espString), [espString]);
  const isWaiting =
    Object.keys(wifi).length === 0 && Object.keys(esp).length === 0;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-lg overflow-hidden flex flex-col">
      <div className="bg-white dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <h3 className="text-slate-800 dark:text-white font-semibold flex items-center gap-2">
          <Cpu size={18} className="text-indigo-500" /> Core Infrastructure
        </h3>
        <span className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            Uptime
          </span>
          <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
            {formatUptime(esp.uptime || wifi.uptime)}
          </span>
        </span>
      </div>

      <div className="p-6 flex-1">
        {isWaiting ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 min-h-[150px]">
            <Cpu className="animate-pulse" size={24} />
            <p className="text-sm">Fetching diagnostics...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h4 className="text-[11px] font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
                <Wifi size={14} /> Network Edge
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <MetricBox label="IP Address" value={wifi.ip} />
                <MetricBox label="Network SSID" value={wifi.ssid} />
                <MetricBox
                  label="Signal (RSSI)"
                  value={wifi.rssi}
                  unit=" dBm"
                />
                <MetricBox label="Dropouts" value={wifi.reconnects} />
              </div>
            </div>

            <div className="pt-5 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-[11px] font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
                <Database size={14} /> Hardware Diagnostics
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <MetricBox
                  icon={Database}
                  label="Free Memory"
                  value={esp.heap ? Math.round(esp.heap / 1024) : undefined}
                  unit=" KB"
                />
                <MetricBox
                  icon={Thermometer}
                  label="Core Temp"
                  value={esp.temp}
                  unit=" °C"
                />
                <MetricBox
                  icon={Cpu}
                  label="Processing"
                  value={esp.cpuMHz}
                  unit=" MHz"
                />
                <MetricBox label="Reset Code" value={esp.resetReason} />
              </div>
            </div>

            <div className="text-center pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-200/50 dark:bg-slate-800 px-3 py-1 rounded-full">
                MAC ID: <span className="font-mono">{wifi.mac || "—"}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Main Application Entry
   ================================================================ */

function loadCached() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function saveCached(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore localStorage errors (e.g. quota exceeded)
  }
}

export default function DashboardHome() {
  const cached = useMemo(() => loadCached(), []);

  const [arduino, setArduino] = useState(cached?.arduino || "");
  const [wifi, setWifi] = useState(cached?.wifi || "");
  const [gsm, setGsm] = useState(cached?.gsm || "");
  const [esp, setEsp] = useState(cached?.esp || "");

  const [pendingCmd, setPendingCmd] = useState(null);
  const wsRef = useRef(null);
  const [wsStatus, setWsStatus] = useState("connecting");

  const wsUrl = useMemo(() => {
    const host = window.location.hostname || "localhost";
    return `ws://${host}:8080`;
  }, []);

  useEffect(() => {
    saveCached({ arduino, wifi, gsm, esp });
  }, [arduino, wifi, gsm, esp]);

  const applyPayload = useCallback((payload, category) => {
    const safePayload = String(payload || "");
    switch (category) {
      case "arduino":
        setArduino(safePayload);
        break;
      case "wifi":
        setWifi(safePayload);
        break;
      case "gsm":
        setGsm(safePayload);
        break;
      case "esp":
        setEsp(safePayload);
        break;
      default:
        if (safePayload.startsWith("class:")) setArduino(safePayload);
        else if (safePayload.startsWith("wifi:")) setWifi(safePayload);
        else if (safePayload.startsWith("gsm:")) setGsm(safePayload);
        else if (safePayload.startsWith("esp:")) setEsp(safePayload);
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
        // Reconnect logic
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

  const buttons = [
    {
      cmd: "AC_REQUEST",
      label: "Toggle AC",
      icon: Wind,
      colour: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20",
    },
    {
      cmd: "EMERGENCY_REQ",
      label: "Trigger Emergency",
      icon: ShieldAlert,
      colour: "bg-red-600 hover:bg-red-700 shadow-red-600/20",
    },
    {
      cmd: "WASHROOM_REQUEST",
      label: "Call Janitor",
      icon: Droplets,
      colour: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20",
    },
    {
      cmd: "TEACHER_FORCE_PRESENT",
      label: "Force Attendance",
      icon: Users,
      colour: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Area */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                EduGuard Command
              </h1>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  wsStatus === "connected"
                    ? "bg-emerald-100 text-emerald-700"
                    : wsStatus === "connecting"
                      ? "bg-amber-100 text-amber-700 animate-pulse"
                      : "bg-red-100 text-red-700"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${wsStatus === "connected" ? "bg-emerald-500" : wsStatus === "connecting" ? "bg-amber-500" : "bg-red-500"}`}
                />
                {wsStatus}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-medium">
              Enterprise Telemetry & Remote Management Node
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {buttons.map(({ cmd, label, icon: BtnIcon, colour }) => (
              <button
                key={cmd}
                disabled={pendingCmd !== null || wsStatus !== "connected"}
                className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none active:scale-95 ${colour}`}
                onClick={() => sendCommand(cmd)}
              >
                {pendingCmd === cmd ? (
                  <Activity className="animate-pulse" size={18} />
                ) : (
                  <BtnIcon size={18} />
                )}
                {pendingCmd === cmd ? "Transmitting…" : label}
              </button>
            ))}
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="grid gap-8 xl:grid-cols-2">
          <ArduinoWidget dataString={arduino} />
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-2 col-span-1 xl:col-span-2">
            <GsmWidget dataString={gsm} />
            <SystemWidget wifiString={wifi} espString={esp} />
          </div>
        </div>
      </div>
    </div>
  );
}
