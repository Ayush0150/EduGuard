function trimTrailingSlash(value) {
  return String(value ?? "").trim().replace(/\/+$/, "");
}

function isBrowser() {
  return typeof window !== "undefined";
}

function isLocalHost(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0"
  );
}

function inferBrowserHttpOrigin() {
  if (!isBrowser()) return "http://localhost:8080";

  const { protocol, hostname } = window.location;
  if (isLocalHost(hostname)) return "http://localhost:8080";

  return `${protocol}//${hostname}`;
}

function inferBrowserWsOrigin() {
  if (!isBrowser()) return "ws://localhost:8080";

  const { protocol, hostname } = window.location;
  if (isLocalHost(hostname)) return "ws://localhost:8080";

  const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
  return `${wsProtocol}//${hostname}`;
}

function httpToWs(url) {
  return url.replace(/^http:/i, "ws:").replace(/^https:/i, "wss:");
}

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || inferBrowserHttpOrigin()
);

export const WS_URL = trimTrailingSlash(
  import.meta.env.VITE_WS_URL ||
    (API_BASE_URL ? httpToWs(API_BASE_URL) : inferBrowserWsOrigin())
);
