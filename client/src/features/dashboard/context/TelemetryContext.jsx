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
const TELEMETRY_STALE_MS = 12_000; // 12 s — device considered offline if no arduino telemetry
const STALE_DEBOUNCE_COUNT = 3; // require 3 consecutive stale checks before flipping UI

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

function shouldAcceptArduinoPayload(currentPayload, nextPayload, isFresh) {
  // Always accept when we have no recent live data — stale cache must not block live telemetry
  if (!isFresh) return true;

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
  const [config, setConfig] = useState(cached?.config || "");
  const [smsTemplates, setSmsTemplates] = useState(cached?.smsTemplates || "");
  const [pendingCmd, setPendingCmd] = useState(null);

  /* ── Pre-parsed config object — centralised for all consumers ── */
  const configParsed = useMemo(() => {
    if (!config) return {};
    const obj = {};
    String(config)
      .split(",")
      .forEach((part) => {
        const i = part.indexOf("=");
        if (i > 0) obj[part.slice(0, i).trim()] = part.slice(i + 1).trim();
      });
    return obj;
  }, [config]);

  /* Derived deviceId — used for commands & events instead of hardcoded value */
  const deviceId = useMemo(() => {
    const room = configParsed.classroom || "706";
    return `CLASSROOM-${room}`;
  }, [configParsed.classroom]);
  const wsRef = useRef(null);
  const ackCallbacksRef = useRef(new Map());
  const arduinoRef = useRef(cached?.arduino || "");
  const gsmRef = useRef(cached?.gsm || "");
  const gsmLastSeenRef = useRef(0); // timestamp of last live GSM telemetry
  const gsmStaleTimerRef = useRef(null);
  const [wsStatus, setWsStatus] = useState("connecting");
  const cacheTimerRef = useRef(null);

  /* ── Telemetry freshness tracking ── */
  const lastArduinoAtRef = useRef(0);
  const staleCountRef = useRef(0); // consecutive stale ticks
  const [telemetryFresh, setTelemetryFresh] = useState(false);

  /* ── Device (ESP32) online state — tracks server device_status events ── */
  const [deviceOnline, setDeviceOnline] = useState(false);

  const wsUrl = useMemo(() => {
    const host = window.location.hostname || "localhost";
    return `ws://${host}:8080`;
  }, []);

  /* Throttle localStorage writes to at most once every 5 s */
  useEffect(() => {
    if (cacheTimerRef.current) return; // already scheduled
    cacheTimerRef.current = setTimeout(() => {
      saveCached({ arduino, wifi, gsm, esp, device, config, smsTemplates });
      cacheTimerRef.current = null;
    }, 5000);
  }, [arduino, wifi, gsm, esp, device, config, smsTemplates]);

  /* Flush pending cache on unmount */
  useEffect(() => {
    return () => {
      clearTimeout(cacheTimerRef.current);
      cacheTimerRef.current = null;
    };
  }, []);

  /* ── Freshness watchdog: debounced — won't flicker on transient gaps ── */
  useEffect(() => {
    const id = setInterval(() => {
      const isStale =
        Date.now() - lastArduinoAtRef.current >= TELEMETRY_STALE_MS;
      if (isStale) {
        staleCountRef.current += 1;
        if (staleCountRef.current >= STALE_DEBOUNCE_COUNT) {
          setTelemetryFresh(false);
        }
      } else {
        staleCountRef.current = 0;
        setTelemetryFresh(true);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

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
        case "arduino": {
          const isFresh =
            Date.now() - lastArduinoAtRef.current < TELEMETRY_STALE_MS;
          if (!shouldAcceptArduinoPayload(arduinoRef.current, safe, isFresh))
            return;
          lastArduinoAtRef.current = Date.now();
          staleCountRef.current = 0;
          setTelemetryFresh(true);
          setDeviceOnline(true);
          if (safe !== arduinoRef.current) {
            arduinoRef.current = safe;
            setArduino(safe);
          }
          break;
        }
        case "wifi":
          setWifi(safe);
          break;
        case "gsm": {
          const parsed = parseToObject(safe);
          const hasReady = "gsmReady" in parsed;
          const isOfflineUpdate = parsed.gsmReady === "false";

          // If payload has no gsmReady key (e.g. server-cached SMS counters),
          // merge it into existing GSM data without overwriting modem status.
          if (!hasReady && gsmRef.current) {
            const cur = parseToObject(gsmRef.current);
            const merged = { ...cur, ...parsed };
            const mergedStr = Object.entries(merged)
              .map(([k, v]) => `${k}=${v}`)
              .join(",");
            gsmRef.current = mergedStr;
            setGsm(mergedStr);
            break;
          }

          // Accept offline updates unconditionally
          if (isOfflineUpdate) {
            gsmRef.current = safe;
            setGsm(safe);
            break;
          }

          // Reject invalid GSM data only when we already have data
          if (!hasValidGsmData(safe) && gsmRef.current) return;

          gsmRef.current = safe;
          setGsm(safe);
          resetGsmStaleTimer();
          break;
        }
        case "esp":
          setEsp(safe);
          break;
        case "device":
          setDevice(safe);
          break;
        case "config":
          setConfig(safe);
          break;
        case "smsTemplates":
          setSmsTemplates(safe);
          break;
        default:
          if (safe.startsWith("class:")) {
            const isFresh =
              Date.now() - lastArduinoAtRef.current < TELEMETRY_STALE_MS;
            if (!shouldAcceptArduinoPayload(arduinoRef.current, safe, isFresh))
              return;
            lastArduinoAtRef.current = Date.now();
            if (safe !== arduinoRef.current) {
              arduinoRef.current = safe;
              setArduino(safe);
            }
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
            // Track ESP32 device online/offline state
            if (data.online === true) {
              setDeviceOnline(true);
            } else if (data.online === false) {
              setDeviceOnline(false);
              markGsmOffline();
              lastArduinoAtRef.current = 0;
              setTelemetryFresh(false);
            }
            break;
          case "control_status":
            if (data.status !== "sent") setPendingCmd(null);
            break;
          case "control_ack": {
            const ackCmd = data.command;
            const cb = ackCallbacksRef.current.get(ackCmd);
            if (cb) {
              clearTimeout(cb.timer);
              ackCallbacksRef.current.delete(ackCmd);
              cb.resolve(ackCmd);
            }
            setPendingCmd(null);
            break;
          }
          default:
            break;
        }
      };

      ws.onerror = () => {};

      ws.onclose = () => {
        if (!mounted) return;
        setWsStatus("disconnected");
        wsRef.current = null;
        ackCallbacksRef.current.forEach(({ timer, reject: rej }) => {
          clearTimeout(timer);
          try {
            rej(new Error("Disconnected"));
          } catch {
            /* swallow — callback already settled */
          }
        });
        ackCallbacksRef.current.clear();
        lastArduinoAtRef.current = 0;
        setTelemetryFresh(false);
        setDeviceOnline(false);
        retryTimer = setTimeout(openSocket, retryDelay);
        retryDelay = Math.min(retryDelay * 2, RECONNECT_MAX);
      };
    }

    /* ── Network offline: immediately close socket so wsStatus flips ── */
    function handleOffline() {
      if (ws && ws.readyState === WebSocket.OPEN) {
        clearTimeout(retryTimer);
        ws.close();
      }
    }

    window.addEventListener("offline", handleOffline);
    openSocket();

    return () => {
      mounted = false;
      clearTimeout(retryTimer);
      window.removeEventListener("offline", handleOffline);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      wsRef.current = null;
    };
  }, [wsUrl, applyPayload, markGsmOffline]);

  /**
   * sendRawCommand — fire-and-forget. No debounce, no pendingCmd lock.
   * Use for settings changes, GET_CONFIG, and other non-UI-blocking commands.
   */
  const sendRawCommand = useCallback(
    (cmd) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(
        JSON.stringify({
          type: "control",
          device: deviceId,
          command: cmd,
        })
      );
    },
    [deviceId]
  );

  /**
   * sendTrackedCommand — returns a Promise that resolves on ESP32 ack.
   * Rejects on timeout (default 6 s). Used by SettingsPage for reliable saves.
   */
  const sendTrackedCommand = useCallback(
    (cmd, timeoutMs = 6000) => {
      return new Promise((resolve, reject) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return reject(new Error("Not connected"));
        }
        const prev = ackCallbacksRef.current.get(cmd);
        if (prev) {
          clearTimeout(prev.timer);
          ackCallbacksRef.current.delete(cmd);
        }
        const timer = setTimeout(() => {
          ackCallbacksRef.current.delete(cmd);
          reject(new Error("Timeout"));
        }, timeoutMs);
        ackCallbacksRef.current.set(cmd, { resolve, reject, timer });
        wsRef.current.send(
          JSON.stringify({ type: "control", device: deviceId, command: cmd })
        );
      });
    },
    [deviceId]
  );

  /**
   * sendCommand — debounced, single-command lock for Quick Action buttons.
   * Blocks duplicate sends until ack or 8 s timeout.
   */
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
          device: deviceId,
          command: cmd,
        })
      );
      setTimeout(() => setPendingCmd((p) => (p === cmd ? null : p)), 8000);
    },
    [pendingCmd, deviceId]
  );

  /* ── Global Event Tracking (shared across all pages) ── */
  const MAX_EVENTS = 500;
  const [events, setEvents] = useState([]);
  const prevSnapRef = useRef({});
  const eventIdRef = useRef(0);

  /* Persist event to backend (fire-and-forget) */
  const persistEvent = useCallback(
    (type, detail, meta, ts) => {
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
          device: deviceId,
          ts,
        }),
      }).catch(() => {
        /* silent — persistence is best-effort */
      });
    },
    [deviceId]
  );

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
  const roomLabel = configParsed.classroom || "—";

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
          Room: roomLabel,
          Period: a.P || "—",
          Gas: a.GS || "—",
        });
      }
      if (snap.ac && !prev.ac) {
        pushEvent("acRequest", undefined, {
          Room: roomLabel,
          Period: a.P || "—",
        });
      }
      if (snap.washroom && !prev.washroom) {
        pushEvent("washroom", undefined, {
          "Gas Level": a.GS ? `${a.GS} ppm` : "—",
          Room: roomLabel,
          Period: a.P || "—",
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
      /* system/ws events removed — not useful for classroom monitoring */
    }

    prevSnapRef.current = snap;
  }, [arduino, wsStatus, pushEvent, roomLabel]);

  const value = useMemo(
    () => ({
      arduino,
      wifi,
      gsm,
      esp,
      device,
      config,
      configParsed,
      deviceId,
      smsTemplates,
      wsStatus,
      pendingCmd,
      sendCommand,
      sendRawCommand,
      sendTrackedCommand,
      events,
      telemetryFresh,
      deviceOnline,
    }),
    [
      arduino,
      wifi,
      gsm,
      esp,
      device,
      config,
      configParsed,
      deviceId,
      smsTemplates,
      wsStatus,
      pendingCmd,
      sendCommand,
      sendRawCommand,
      sendTrackedCommand,
      events,
      telemetryFresh,
      deviceOnline,
    ]
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
