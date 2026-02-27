/**
 * TelemetryContext
 * ----------------
 * Shared WebSocket connection + telemetry state for all dashboard pages.
 * Provides: arduino, wifi, gsm, esp, device strings + wsStatus + sendCommand.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const STORAGE_KEY = "eduguard_telemetry";
const RECONNECT_BASE = 1000;
const RECONNECT_MAX = 16000;
const GSM_STALE_TIMEOUT = 35_000; // 35 s — ESP32 sends GSM health every 10 s

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
  )
    return true;
  if (nextPeriod === currentPeriod && nextPT + 2 < currentPT) return false;
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

/* ── Context ── */
const TelemetryContext = createContext(null);

export function TelemetryProvider({ children }) {
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
  const gsmLastSeenRef = useRef(0); // timestamp of last live GSM telemetry
  const gsmStaleTimerRef = useRef(null);
  const [wsStatus, setWsStatus] = useState("connecting");

  const wsUrl = useMemo(() => {
    const host = window.location.hostname || "localhost";
    return `ws://${host}:8080`;
  }, []);

  useEffect(() => {
    saveCached({ arduino, wifi, gsm, esp, device });
  }, [arduino, wifi, gsm, esp, device]);

  /* Mark GSM as offline by patching the current payload */
  const markGsmOffline = useCallback(() => {
    const cur = gsmRef.current;
    if (!cur) return;
    const parsed = parseToObject(cur);
    if (parsed.gsmReady === "false") return; // already offline
    const offlinePayload = cur
      .replace(/gsmReady=true/g, "gsmReady=false")
      .replace(/signal=[^,]*/g, "signal=N/A")
      .replace(/reg=[^,]*/g, "reg=N/A");
    gsmRef.current = offlinePayload;
    setGsm(offlinePayload);
  }, []);

  /* Reset staleness timer every time we get live GSM data */
  const resetGsmStaleTimer = useCallback(() => {
    gsmLastSeenRef.current = Date.now();
    clearTimeout(gsmStaleTimerRef.current);
    gsmStaleTimerRef.current = setTimeout(() => {
      markGsmOffline();
    }, GSM_STALE_TIMEOUT);
  }, [markGsmOffline]);

  /* Clean up stale timer on unmount */
  useEffect(() => {
    return () => clearTimeout(gsmStaleTimerRef.current);
  }, []);

  const applyPayload = useCallback(
    (payload, category) => {
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
        case "gsm": {
          // Always accept payloads that set gsmReady=false (offline updates)
          const parsed = parseToObject(safe);
          const isOfflineUpdate = parsed.gsmReady === "false";
          if (!isOfflineUpdate && !hasValidGsmData(safe) && gsmRef.current)
            return;
          gsmRef.current = safe;
          setGsm(safe);
          // Reset staleness timer only for live (online) GSM data
          if (!isOfflineUpdate) resetGsmStaleTimer();
          break;
        }
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
    },
    [resetGsmStaleTimer]
  );

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
          case "device_status":
            // When ESP32 device goes offline, mark GSM as offline
            if (data.online === false) markGsmOffline();
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
  }, [wsUrl, applyPayload, markGsmOffline]);

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

  /* ── Global Event Tracking (shared across all pages) ── */
  const MAX_EVENTS = 500;
  const [events, setEvents] = useState([]);
  const prevSnapRef = useRef({});
  const eventIdRef = useRef(0);

  /* Persist event to backend (fire-and-forget) */
  const persistEvent = useCallback((type, detail, meta, ts) => {
    const apiBase =
      import.meta.env.VITE_API_BASE_URL ??
      `http://${window.location.hostname}:8080`;
    fetch(`${apiBase}/api/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        detail: detail || null,
        meta: meta || null,
        device: "CLASSROOM-706",
        ts,
      }),
    }).catch(() => {
      /* silent — persistence is best-effort */
    });
  }, []);

  const pushEvent = useCallback(
    (type, detail, meta) => {
      eventIdRef.current += 1;
      const ts = Date.now();
      setEvents((prev) =>
        [{ id: eventIdRef.current, type, ts, detail, meta }, ...prev].slice(
          0,
          MAX_EVENTS
        )
      );
      persistEvent(type, detail, meta, ts);
    },
    [persistEvent]
  );

  /* Rising-edge event detection from telemetry */
  useEffect(() => {
    const a = parseToObject(arduino);
    const snap = {
      emergency: a.isEmergencyReq === "true",
      ac: a.isACReq === "true",
      washroom: a.isWashroomDirty === "true",
      absent: a.isTeacherAbsent === "true",
      present: a.isPresent === "true",
      period: a.P,
      system: a.isSystemActive === "true",
      ws: wsStatus === "connected",
    };

    const prev = prevSnapRef.current;
    const hasAnyPrev = Object.keys(prev).length > 0;

    if (hasAnyPrev) {
      if (snap.emergency && !prev.emergency) {
        pushEvent("emergency", undefined, {
          Room: "706",
          Period: a.P || "—",
          Gas: a.GS || "—",
        });
      }
      if (snap.ac && !prev.ac) {
        pushEvent("acRequest", undefined, {
          Room: "706",
          Period: a.P || "—",
        });
      }
      if (snap.washroom && !prev.washroom) {
        pushEvent("washroom", undefined, {
          "Gas Level": a.GS ? `${a.GS} ppm` : "—",
          Room: "706",
        });
      }
      if (snap.absent && !prev.absent) {
        pushEvent("teacherAbsent", undefined, {
          Period: a.P || "—",
          "Time Elapsed": a.PT ? `${a.PT}s` : "—",
        });
      }
      if (snap.present && !prev.present) {
        pushEvent("teacherPresent", undefined, {
          Period: a.P || "—",
          "Arrival At": a.T || "—",
        });
      }
      if (snap.period && prev.period && snap.period !== prev.period) {
        pushEvent("periodChange", `Period ${snap.period} started`, {
          "New Period": snap.period,
          Previous: prev.period,
        });
      }
      if (snap.system && !prev.system) {
        pushEvent("systemOnline");
      }
      if (!snap.system && prev.system) {
        pushEvent("systemOffline");
      }
      if (snap.ws && !prev.ws) {
        pushEvent("wsConnected");
      }
      if (!snap.ws && prev.ws) {
        pushEvent("wsDisconnected");
      }
    }

    prevSnapRef.current = snap;
  }, [arduino, wsStatus, pushEvent]);

  const value = useMemo(
    () => ({
      arduino,
      wifi,
      gsm,
      esp,
      device,
      wsStatus,
      pendingCmd,
      sendCommand,
      events,
    }),
    [arduino, wifi, gsm, esp, device, wsStatus, pendingCmd, sendCommand, events]
  );

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetry() {
  const ctx = useContext(TelemetryContext);
  if (!ctx)
    throw new Error("useTelemetry must be used within a TelemetryProvider");
  return ctx;
}
