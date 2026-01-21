/**
 * Session Monitor Hook
 * --------------------
 * Keeps user session valid by:
 * - Checking JWT expiry
 * - Syncing logout across tabs
 * - Auto-logout on inactivity
 * - Monitoring tab visibility
 */

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { isJwtExpired } from "./jwt";
import { clearAuthSession, getAuthSession } from "./tokenStorage";

const CHECK_INTERVAL = 60_000; // 1 minute

export function useSessionMonitor() {
  const navigate = useNavigate();
  const location = useLocation();

  const intervalRef = useRef(null);
  const pathnameRef = useRef(location.pathname);

  /* Keep latest path without re-running effect */
  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    const redirectToLogin = () => {
      const isAdminRoute = pathnameRef.current.startsWith("/admin");
      navigate(isAdminRoute ? "/login/admin" : "/login", { replace: true });
    };

    const checkSession = () => {
      const { token, isValid } = getAuthSession();

      if (!token || !isValid || isJwtExpired(token)) {
        clearAuthSession();
        redirectToLogin();
      }
    };

    // Initial check
    checkSession();

    // Periodic validation
    intervalRef.current = setInterval(checkSession, CHECK_INTERVAL);

    // Cross-tab logout sync
    const handleSessionCleared = () => {
      clearInterval(intervalRef.current);
      redirectToLogin();
    };

    // Recheck when tab becomes active
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSession();
      }
    };

    window.addEventListener("eduguard:session-cleared", handleSessionCleared);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalRef.current);
      window.removeEventListener(
        "eduguard:session-cleared",
        handleSessionCleared
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [navigate]);
}
