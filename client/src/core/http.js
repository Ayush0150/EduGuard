import axios from "axios";
import { isJwtExpired } from "./auth/jwt";
import { clearAuthSession, getAccessToken } from "./auth/tokenStorage";

/**
 * Central HTTP Client - Production Grade
 *
 * Features:
 * - Automatic token attachment
 * - Token expiry detection
 * - Unified error handling
 * - Session management
 * - Request/response logging
 */

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request Interceptor - Attach auth token and validate expiry
 */
http.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      // Check if token is expired before making request
      if (isJwtExpired(token)) {
        clearAuthSession();

        // Redirect to appropriate login page
        const isAdminRoute = config.url?.includes("/admin");
        const loginPath = isAdminRoute ? "/login/admin" : "/login";

        if (!window.location.pathname.startsWith("/login")) {
          window.location.replace(loginPath);
        }

        return Promise.reject(new axios.Cancel("Token expired"));
      }

      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    if (import.meta.env.DEV) {
      console.error("Request interceptor error:", error);
    }
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor - Handle errors and session management
 */
http.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle cancelled requests
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const status = error?.response?.status;
    const config = error?.config;

    // Network error or timeout
    if (!status) {
      if (import.meta.env.DEV) {
        console.error("Network error:", error.message);
      }

      // Don't show error for background requests
      if (!config?.silent && import.meta.env.DEV) {
        console.error(
          "Connection failed. Please check your internet connection."
        );
      }

      return Promise.reject(error);
    }

    // 401 Unauthorized - Clear session and redirect
    if (status === 401) {
      clearAuthSession();

      // Determine correct login page based on current path
      const currentPath = window.location.pathname;
      const isAdminArea = currentPath.startsWith("/admin");
      const loginPath = isAdminArea ? "/login/admin" : "/login";

      if (!window.location.pathname.startsWith("/login")) {
        // Store the attempted URL for redirect after login
        const from = currentPath !== "/" ? currentPath : null;
        const redirectUrl = from
          ? `${loginPath}?from=${encodeURIComponent(from)}`
          : loginPath;

        window.location.replace(redirectUrl);
      }
    }

    // 403 Forbidden - Keep session but show access denied
    if (status === 403) {
      if (!window.location.pathname.startsWith("/access-denied")) {
        window.location.replace("/access-denied");
      }
    }

    // 429 Too Many Requests - Rate limiting
    if (status === 429 && import.meta.env.DEV) {
      console.warn("Rate limit exceeded. Please try again later.");
    }

    // 500+ Server errors
    if (status >= 500 && import.meta.env.DEV) {
      console.error(
        "Server error occurred:",
        error.response?.data?.message || "Unknown error"
      );
    }

    return Promise.reject(error);
  }
);

export default http;
