/**
 * Session Monitor Hook
 *
 * Monitors session validity, handles cross-tab synchronization,
 * and automatically logs out users on session expiry
 */

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isJwtExpired } from "./jwt";
import { clearAuthSession, getAuthSession } from "./tokenStorage";

const CHECK_INTERVAL = 60000; // Check every minute

export function useSessionMonitor() {
  const navigate = useNavigate();
  const location = useLocation();
  const checkIntervalRef = useRef(null);

  useEffect(() => {
    // Check session validity
    const checkSession = () => {
      const { token, isValid } = getAuthSession();

      if (!token || !isValid || isJwtExpired(token)) {
        clearAuthSession();

        // Determine login page based on current location
        const loginPath = location.pathname.startsWith("/admin")
          ? "/login/admin"
          : "/login";

        window.location.replace(loginPath);
      }
    };

    // Initial check
    checkSession();

    // Set up periodic checks
    checkIntervalRef.current = setInterval(checkSession, CHECK_INTERVAL);

    // Listen for session cleared events from other tabs
    const handleSessionCleared = () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }

      const loginPath = location.pathname.startsWith("/admin")
        ? "/login/admin"
        : "/login";

      window.location.replace(loginPath);
    };

    window.addEventListener("eduguard:session-cleared", handleSessionCleared);

    // Listen for visibility change (tab becomes visible)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      window.removeEventListener(
        "eduguard:session-cleared",
        handleSessionCleared
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [navigate, location.pathname]);
}
