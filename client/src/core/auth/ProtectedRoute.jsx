/**
 * Protected Route Component - Production Grade
 *
 * Features:
 * - Validates session and token expiry
 * - Role-based access control
 * - Smart redirects based on user role
 * - Prevents infinite redirect loops
 * - Session synchronization across tabs
 */

import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { decodeJwt, isJwtExpired } from "./jwt";
import { clearAuthSession, getAuthSession } from "./tokenStorage";

/**
 * Extract role from session with fallback to token
 */
function getRoleFromSession({ token, user }) {
  return user?.role ?? decodeJwt(token)?.role ?? null;
}

/**
 * Determine correct redirect path based on role
 */
function getRedirectPath(role, currentPath) {
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  // Admin trying to access user dashboard -> redirect to admin
  if (currentPath.startsWith("/dashboard") && isAdmin) {
    return "/admin";
  }

  // Regular user trying to access admin -> redirect to dashboard
  if (currentPath.startsWith("/admin") && !isAdmin) {
    return "/dashboard";
  }

  return null;
}

export default function ProtectedRoute({ requiredRoles }) {
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const { token, user, isValid } = getAuthSession();

  // Listen for session cleared event from other tabs
  useEffect(() => {
    const handleSessionCleared = () => {
      window.location.replace("/login");
    };

    window.addEventListener("eduguard:session-cleared", handleSessionCleared);
    return () => {
      window.removeEventListener(
        "eduguard:session-cleared",
        handleSessionCleared
      );
    };
  }, []);

  // Validate session on mount
  useEffect(() => {
    setIsValidating(false);
  }, []);

  // Show loading state during validation
  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
            Validating session...
          </p>
        </div>
      </div>
    );
  }

  // No token or invalid session -> redirect to login
  if (!token || !isValid) {
    clearAuthSession();
    const loginPath = location.pathname.startsWith("/admin")
      ? "/login/admin"
      : "/login";
    return (
      <Navigate to={loginPath} replace state={{ from: location.pathname }} />
    );
  }

  // Token expired -> clear session and redirect
  if (isJwtExpired(token)) {
    clearAuthSession();
    const loginPath = location.pathname.startsWith("/admin")
      ? "/login/admin"
      : "/login";
    return (
      <Navigate to={loginPath} replace state={{ from: location.pathname }} />
    );
  }

  const role = getRoleFromSession({ token, user });

  // Smart role-based redirects to prevent users from accessing wrong dashboard
  const redirectPath = getRedirectPath(role, location.pathname);
  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  // Role-based access control
  if (Array.isArray(requiredRoles) && requiredRoles.length) {
    if (!role || !requiredRoles.includes(role)) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  return <Outlet />;
}
