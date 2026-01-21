/**
 * Session Management Utility
 * --------------------------
 * Handles secure auth persistence, expiry control,
 * cross-tab synchronization, and safe cleanup.
 */

const ACCESS_TOKEN_KEY = "eduguard_access_token";
const AUTH_SESSION_KEY = "eduguard_auth_session";
const SESSION_TIMESTAMP_KEY = "eduguard_session_timestamp";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/* ---------------------------------------------------
   Environment
--------------------------------------------------- */

function isBrowser() {
  return typeof window !== "undefined";
}

/* ---------------------------------------------------
   Storage Helpers
--------------------------------------------------- */

function getStorage(remember) {
  return remember ? localStorage : sessionStorage;
}

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------
   Expiry
--------------------------------------------------- */

function isSessionExpired() {
  if (!isBrowser()) return true;

  const timestamp =
    localStorage.getItem(SESSION_TIMESTAMP_KEY) ||
    sessionStorage.getItem(SESSION_TIMESTAMP_KEY);

  if (!timestamp) return true;

  return Date.now() - Number(timestamp) > SESSION_DURATION_MS;
}

/* ---------------------------------------------------
   Public API
--------------------------------------------------- */

export function setAuthSession({ token, user = null, remember = true }) {
  if (!isBrowser() || !token) return;

  try {
    const storage = getStorage(remember);
    const other = remember ? sessionStorage : localStorage;

    // Prevent mixed sessions
    [other, storage].forEach((s) => {
      s.removeItem(AUTH_SESSION_KEY);
      s.removeItem(ACCESS_TOKEN_KEY);
      s.removeItem(SESSION_TIMESTAMP_KEY);
    });

    const session = {
      token,
      user,
      remember,
      timestamp: Date.now(),
    };

    storage.setItem(ACCESS_TOKEN_KEY, token);
    storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    storage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));
  } catch (err) {}
}

export function getAuthSession() {
  if (!isBrowser()) {
    return { token: null, user: null, isValid: false };
  }

  try {
    if (isSessionExpired()) {
      clearAuthSession();
      return { token: null, user: null, isValid: false };
    }

    const session =
      safeParse(localStorage.getItem(AUTH_SESSION_KEY)) ||
      safeParse(sessionStorage.getItem(AUTH_SESSION_KEY));

    if (!session?.token) {
      return { token: null, user: null, isValid: false };
    }

    const storage = session.remember ? localStorage : sessionStorage;
    storage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));

    return {
      token: session.token,
      user: session.user ?? null,
      isValid: true,
    };
  } catch (err) {
    return { token: null, user: null, isValid: false };
  }
}

export function getAccessToken() {
  if (!isBrowser()) return null;

  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    sessionStorage.getItem(ACCESS_TOKEN_KEY)
  );
}

export function hasActiveSession() {
  const { token, isValid } = getAuthSession();
  return Boolean(token && isValid);
}

export function updateSessionUser(user) {
  if (!isBrowser() || !user) return;

  try {
    const session =
      safeParse(localStorage.getItem(AUTH_SESSION_KEY)) ||
      safeParse(sessionStorage.getItem(AUTH_SESSION_KEY));

    if (!session) return;

    session.user = user;

    const storage = session.remember ? localStorage : sessionStorage;
    storage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch (err) {}
}

export function clearAuthSession() {
  if (!isBrowser()) return;

  try {
    [localStorage, sessionStorage].forEach((storage) => {
      storage.removeItem(ACCESS_TOKEN_KEY);
      storage.removeItem(AUTH_SESSION_KEY);
      storage.removeItem(SESSION_TIMESTAMP_KEY);
    });

    window.dispatchEvent(new Event("eduguard:session-cleared"));
  } catch (err) {}
}

/* ---------------------------------------------------
   Cross-tab Sync
--------------------------------------------------- */

if (isBrowser()) {
  window.addEventListener("storage", (event) => {
    if (
      event.key === AUTH_SESSION_KEY ||
      event.key === ACCESS_TOKEN_KEY ||
      event.key === SESSION_TIMESTAMP_KEY
    ) {
      if (!event.newValue) {
        window.dispatchEvent(new Event("eduguard:session-cleared"));
      }
    }
  });

  if (isSessionExpired()) {
    clearAuthSession();
  }
}
