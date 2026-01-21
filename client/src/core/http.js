/**
 * Central HTTP Client
 * -------------------
 * Production-grade Axios instance.
 *
 * Responsibilities:
 * - Attach JWT token
 * - Detect token expiry
 * - Emit global auth events
 *
 * Navigation and UI handling are done by React.
 */

import axios from "axios";
import { isJwtExpired } from "./auth/jwt";
import { clearAuthSession, getAccessToken } from "./auth/tokenStorage";

/* ---------------------------------------------------
   Instance
--------------------------------------------------- */

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080",
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
   Response Interceptor
--------------------------------------------------- */

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const status = error?.response?.status;

    if (status === 401 && !authExpiredEmitted) {
      authExpiredEmitted = true;
      clearAuthSession();
      window.dispatchEvent(new Event("eduguard:auth-expired"));
    }

    if (status === 403) {
      window.dispatchEvent(new Event("eduguard:access-denied"));
    }

    return Promise.reject(error);
  }
);

export default http;
