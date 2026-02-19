/**
 * =====================================================
 * useAuth Hook
 * =====================================================
 *
 * Centralized authentication hook for React components.
 * Provides consistent access to auth state and actions.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { decodeJwt, isJwtExpired } from "./jwt";
import {
  clearAuthSession,
  getAuthSession,
  setAuthSession,
  updateSessionUser,
} from "./tokenStorage";

/* ---------------------------------------------------
   Constants
--------------------------------------------------- */

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

/* ---------------------------------------------------
   Hook
--------------------------------------------------- */

export function useAuth() {
  const navigate = useNavigate();
  const location = useLocation();

  const [authState, setAuthState] = useState(() => {
    const { token, user, isValid } = getAuthSession();
    return { token, user, isValid, loading: false };
  });

  /* ---------------------------------------------------
     Computed Values
  --------------------------------------------------- */

  const isAuthenticated = useMemo(() => {
    const { token, isValid } = authState;
    return Boolean(token && isValid && !isJwtExpired(token));
  }, [authState]);

  const role = useMemo(() => {
    const { token, user } = authState;
    return user?.role ?? decodeJwt(token)?.role ?? null;
  }, [authState]);

  const isAdmin = useMemo(() => {
    return ADMIN_ROLES.includes(role);
  }, [role]);

  const user = useMemo(() => authState.user, [authState.user]);

  /* ---------------------------------------------------
     Actions
  --------------------------------------------------- */

  const login = useCallback(
    ({ token, user, remember = true }) => {
      setAuthSession({ token, user, remember });
      setAuthState({ token, user, isValid: true, loading: false });

      // Navigate to appropriate dashboard
      const redirectTo = ADMIN_ROLES.includes(user?.role)
        ? "/admin"
        : "/dashboard";

      const from = location.state?.from;
      navigate(from || redirectTo, { replace: true });
    },
    [navigate, location.state]
  );

  const logout = useCallback(() => {
    clearAuthSession();
    setAuthState({ token: null, user: null, isValid: false, loading: false });

    const loginPath = location.pathname.startsWith("/admin")
      ? "/login/admin"
      : "/login";

    navigate(loginPath, { replace: true });
  }, [navigate, location.pathname]);

  const updateUser = useCallback((userData) => {
    updateSessionUser(userData);
    setAuthState((prev) => ({
      ...prev,
      user: { ...prev.user, ...userData },
    }));
  }, []);

  const refreshAuthState = useCallback(() => {
    const { token, user, isValid } = getAuthSession();
    setAuthState({ token, user, isValid, loading: false });
  }, []);

  /* ---------------------------------------------------
     Global Auth Events
  --------------------------------------------------- */

  useEffect(() => {
    function handleAuthExpired() {
      logout();
    }

    function handleAccessDenied() {
      navigate("/access-denied", { replace: true });
    }

    window.addEventListener("eduguard:auth-expired", handleAuthExpired);
    window.addEventListener("eduguard:access-denied", handleAccessDenied);

    return () => {
      window.removeEventListener("eduguard:auth-expired", handleAuthExpired);
      window.removeEventListener("eduguard:access-denied", handleAccessDenied);
    };
  }, [logout, navigate]);

  /* ---------------------------------------------------
     Return
  --------------------------------------------------- */

  return {
    // State
    user,
    role,
    isAuthenticated,
    isAdmin,
    loading: authState.loading,

    // Actions
    login,
    logout,
    updateUser,
    refreshAuthState,
  };
}

export default useAuth;
