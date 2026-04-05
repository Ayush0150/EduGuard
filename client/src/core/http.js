/**
 * Central HTTP Client
 * -------------------
 * Production-grade Axios instance.
 *
 * Responsibilities:
 * - Attach JWT token
 * - Detect token expiry
 * - Emit global auth events
 * - Automatic retry for transient errors
 *
 * Navigation and UI handling are done by React.
 */

import axios from "axios";
import { isJwtExpired } from "./auth/jwt";
import { clearAuthSession, getAccessToken } from "./auth/tokenStorage";
import { API_BASE_URL } from "./config/runtime";

/* ---------------------------------------------------
   Configuration
--------------------------------------------------- */

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// HTTP methods safe to retry (idempotent)
const RETRYABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "PUT", "DELETE"]);

// Status codes that warrant a retry
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

/* ---------------------------------------------------
   Instance
--------------------------------------------------- */

const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ---------------------------------------------------
   Internal guards
--------------------------------------------------- */

let authExpiredEmitted = false;

/* ---------------------------------------------------
   Request Interceptor
--------------------------------------------------- */

http.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (!token) return config;

  if (isJwtExpired(token)) {
    if (!authExpiredEmitted) {
      authExpiredEmitted = true;
      clearAuthSession();
      window.dispatchEvent(new Event("eduguard:auth-expired"));
    }

    throw new axios.Cancel("JWT expired");
  }

  config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ---------------------------------------------------
   Response Interceptor (with retry logic)
--------------------------------------------------- */

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const config = error.config;
    const status = error?.response?.status;

    // Handle auth errors
    if (status === 401 && !authExpiredEmitted) {
      authExpiredEmitted = true;
      clearAuthSession();
      window.dispatchEvent(new Event("eduguard:auth-expired"));
      return Promise.reject(error);
    }

    if (status === 403) {
      window.dispatchEvent(new Event("eduguard:access-denied"));
      return Promise.reject(error);
    }

    // Retry logic for transient errors
    const shouldRetry =
      config &&
      !config.__retryCount &&
      RETRYABLE_METHODS.has(config.method?.toUpperCase()) &&
      (RETRYABLE_STATUS_CODES.has(status) || !error.response);

    if (shouldRetry) {
      config.__retryCount = config.__retryCount || 0;

      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1;

        // Exponential backoff
        const delay = RETRY_DELAY_MS * Math.pow(2, config.__retryCount - 1);

        await new Promise((resolve) => setTimeout(resolve, delay));

        return http.request(config);
      }
    }

    return Promise.reject(error);
  }
);

export default http;
