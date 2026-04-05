/**
 * =====================================================
 * EduGuard Client Constants
 * =====================================================
 *
 * Centralized constants for the frontend application.
 */

import { API_BASE_URL } from "../config/runtime";

/* =====================================================
   User Roles
===================================================== */

export const ROLES = Object.freeze({
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  PRINCIPAL: "PRINCIPAL",
  SECURITY: "SECURITY",
  MAINTENANCE: "MAINTENANCE",
  USER: "USER",
});

export const ADMIN_ROLES = Object.freeze([ROLES.ADMIN, ROLES.SUPER_ADMIN]);

export const USER_ROLES = Object.freeze([
  ROLES.USER,
  ROLES.SECURITY,
  ROLES.MAINTENANCE,
  ROLES.PRINCIPAL,
]);

export const ALL_ROLES = Object.freeze(Object.values(ROLES));

/* =====================================================
   Route Paths
===================================================== */

export const ROUTES = Object.freeze({
  // Public
  HOME: "/",
  LOGIN: "/login",
  ADMIN_LOGIN: "/login/admin",
  STUDENT_LOGIN: "/login/student",
  FORGOT_PASSWORD: "/forgot-password",
  ADMIN_FORGOT_PASSWORD: "/admin/forgot-password",
  VERIFY_OTP: "/verify-otp",
  ADMIN_VERIFY_OTP: "/admin/verify-otp",
  ADMIN_LOGIN_VERIFY_OTP: "/admin/login/verify-otp",
  RESET_PASSWORD: "/reset-password",
  ADMIN_RESET_PASSWORD: "/admin/reset-password",

  // Protected - User
  DASHBOARD: "/dashboard",

  // Protected - Admin
  ADMIN_DASHBOARD: "/admin",
  ADMIN_CREATE_USER: "/admin/users/create",
  ADMIN_EDIT_USER: "/admin/users/:id",

  // Error
  ACCESS_DENIED: "/access-denied",
});

/* =====================================================
   API Endpoints
===================================================== */

export const API = Object.freeze({
  BASE_URL: API_BASE_URL,

  // Auth
  AUTH: {
    LOGIN: "/api/v1/auth/login",
    ADMIN_LOGIN: "/api/v1/auth/admin/login",
    ADMIN_VERIFY_OTP: "/api/v1/auth/admin/login/verify-otp",
    LOGOUT: "/api/v1/auth/logout",
    ME: "/api/v1/auth/me",
    REQUEST_OTP: "/api/v1/auth/forgot-password/request-otp",
    VERIFY_OTP: "/api/v1/auth/forgot-password/verify-otp",
    RESET_PASSWORD: "/api/v1/auth/forgot-password/reset",
  },

  // Admin
  ADMIN: {
    USERS: "/api/v1/admin/users",
  },
});

/* =====================================================
   Validation Limits
===================================================== */

export const LIMITS = Object.freeze({
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  EMAIL_MAX: 255,
  USERNAME_MIN: 3,
  USERNAME_MAX: 50,
  OTP_LENGTH: 6,
});

/* =====================================================
   Timing Constants
===================================================== */

export const TIMING = Object.freeze({
  TOAST_DURATION: 5000,
  SESSION_CHECK_INTERVAL: 60000, // 1 minute
  OTP_EXPIRY_SECONDS: 300, // 5 minutes
  RESEND_COOLDOWN_SECONDS: 30,
  REQUEST_TIMEOUT: 15000,
});

/* =====================================================
   Storage Keys
===================================================== */

export const STORAGE_KEYS = Object.freeze({
  ACCESS_TOKEN: "eduguard_access_token",
  AUTH_SESSION: "eduguard_auth_session",
  SESSION_TIMESTAMP: "eduguard_session_timestamp",
  THEME: "eduguard_theme",
});
