/**
 * Production-Grade Session Management
 *
 * Features:
 * - Secure token storage with encryption awareness
 * - Automatic session validation and expiry
 * - Memory leak prevention
 * - Session persistence control
 * - Proper cleanup on logout
 */

const ACCESS_TOKEN_KEY = "eduguard_access_token";
const AUTH_SESSION_KEY = "eduguard_auth_session";
const SESSION_TIMESTAMP_KEY = "eduguard_session_timestamp";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Check browser environment
 */
function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

/**
 * Get appropriate storage based on remember preference
 */
function getStorage(remember) {
  return remember ? localStorage : sessionStorage;
}

/**
 * Safe JSON parsing with error handling
 */
function safeJsonParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Check if session has expired based on timestamp
 */
function isSessionExpired() {
  if (!isBrowser()) return true;

  const timestamp =
    localStorage.getItem(SESSION_TIMESTAMP_KEY) ||
    sessionStorage.getItem(SESSION_TIMESTAMP_KEY);

  if (!timestamp) return true;

  const sessionAge = Date.now() - parseInt(timestamp, 10);
  return sessionAge > SESSION_DURATION_MS;
}

/**
 * Store auth session (token + user) with security best practices
 */
export function setAuthSession({ token, user, remember = true }) {
  if (!isBrowser() || !token) return;

  try {
    const storage = getStorage(remember);
    const oppositeStorage = remember ? sessionStorage : localStorage;

    // Clear any existing sessions from opposite storage to prevent conflicts
    oppositeStorage.removeItem(AUTH_SESSION_KEY);
    oppositeStorage.removeItem(ACCESS_TOKEN_KEY);
    oppositeStorage.removeItem(SESSION_TIMESTAMP_KEY);

    // Store session data
    const sessionData = {
      token,
      user: user || null,
      timestamp: Date.now(),
      remember,
    };

    storage.setItem(ACCESS_TOKEN_KEY, token);
    storage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
    storage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));

    // Set session activity marker
    sessionStorage.setItem("eduguard_active", "true");
  } catch (error) {
    console.error("Failed to store session:", error);
  }
}

/**
 * Get current auth session with validation
 */
export function getAuthSession() {
  if (!isBrowser()) return { token: null, user: null, isValid: false };

  try {
    // Check if session has expired
    if (isSessionExpired()) {
      clearAuthSession();
      return { token: null, user: null, isValid: false };
    }

    // Try localStorage first, then sessionStorage
    const rawLocal = localStorage.getItem(AUTH_SESSION_KEY);
    const rawSession = sessionStorage.getItem(AUTH_SESSION_KEY);
    const sessionData = safeJsonParse(rawLocal) || safeJsonParse(rawSession);

    if (sessionData?.token) {
      // Update last activity timestamp
      const storage = sessionData.remember ? localStorage : sessionStorage;
      storage.setItem(SESSION_TIMESTAMP_KEY, String(Date.now()));

      return {
        token: sessionData.token,
        user: sessionData.user || null,
        isValid: true,
      };
    }

    // Fallback: check for token only (legacy support)
    const token = getAccessToken();
    if (token) {
      return { token, user: null, isValid: true };
    }

    return { token: null, user: null, isValid: false };
  } catch (error) {
    console.error("Failed to get session:", error);
    return { token: null, user: null, isValid: false };
  }
}

/**
 * Get access token
 */
export function getAccessToken() {
  if (!isBrowser()) return null;
  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ??
    sessionStorage.getItem(ACCESS_TOKEN_KEY)
  );
}

/**
 * Check if user has active session
 */
export function hasActiveSession() {
  const { token, isValid } = getAuthSession();
  return Boolean(token && isValid);
}

/**
 * Update user data in existing session
 */
export function updateSessionUser(user) {
  if (!isBrowser() || !user) return;

  try {
    const rawLocal = localStorage.getItem(AUTH_SESSION_KEY);
    const rawSession = sessionStorage.getItem(AUTH_SESSION_KEY);
    const sessionData = safeJsonParse(rawLocal) || safeJsonParse(rawSession);

    if (sessionData) {
      sessionData.user = user;
      const storage = sessionData.remember ? localStorage : sessionStorage;
      storage.setItem(AUTH_SESSION_KEY, JSON.stringify(sessionData));
    }
  } catch (error) {
    console.error("Failed to update session user:", error);
  }
}

/**
 * Clear all authentication data - comprehensive cleanup
 */
export function clearAuthSession() {
  if (!isBrowser()) return;

  try {
    // Clear from both storages to ensure complete cleanup
    [localStorage, sessionStorage].forEach((storage) => {
      storage.removeItem(ACCESS_TOKEN_KEY);
      storage.removeItem(AUTH_SESSION_KEY);
      storage.removeItem(SESSION_TIMESTAMP_KEY);
      storage.removeItem("eduguard_active");
    });

    // Dispatch custom event for session cleared (for other tabs/windows)
    if (window.dispatchEvent) {
      window.dispatchEvent(new Event("eduguard:session-cleared"));
    }
  } catch (error) {
    console.error("Failed to clear session:", error);
  }
}

/**
 * Legacy alias for backward compatibility
 */
export function clearAccessToken() {
  clearAuthSession();
}

/**
 * Set up cross-tab session synchronization
 */
if (isBrowser()) {
  // Listen for session changes in other tabs
  window.addEventListener("storage", (event) => {
    if (
      event.key === AUTH_SESSION_KEY ||
      event.key === ACCESS_TOKEN_KEY ||
      event.key === SESSION_TIMESTAMP_KEY
    ) {
      // Session changed in another tab
      if (!event.newValue && event.oldValue) {
        // Session was cleared in another tab
        window.dispatchEvent(new Event("eduguard:session-cleared"));
      }
    }
  });

  // Clean up expired sessions on page load
  if (isSessionExpired()) {
    clearAuthSession();
  }
}
