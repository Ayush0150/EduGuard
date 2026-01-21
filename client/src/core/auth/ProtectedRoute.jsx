/**
 * Protected Route
 * ----------------
 * Enterprise-grade route guard
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";

import { decodeJwt, isJwtExpired } from "./jwt";
import { clearAuthSession, getAuthSession } from "./tokenStorage";

/* -----------------------------------
   Constants
----------------------------------- */

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

/* -----------------------------------
   Helpers
----------------------------------- */

function getUserRole({ token, user }) {
  return user?.role ?? decodeJwt(token)?.role ?? null;
}

function getLoginPath(pathname) {
  return pathname.startsWith("/admin") ? "/login/admin" : "/login";
}

function getDashboardRedirect(role, pathname) {
  const isAdmin = ADMIN_ROLES.includes(role);

  if (pathname.startsWith("/dashboard") && isAdmin) return "/admin";
  if (pathname.startsWith("/admin") && !isAdmin) return "/dashboard";

  return null;
}

/* -----------------------------------
   Component
----------------------------------- */

export default function ProtectedRoute({ requiredRoles = [] }) {
  const location = useLocation();
  const { token, user, isValid } = getAuthSession();

  /* Invalid session */
  if (!token || !isValid) {
    clearAuthSession();

    return (
      <Navigate
        to={getLoginPath(location.pathname)}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  /* Expired token */
  if (isJwtExpired(token)) {
    clearAuthSession();

    return (
      <Navigate
        to={getLoginPath(location.pathname)}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  const role = getUserRole({ token, user });

  /* Smart dashboard redirect */
  const redirectPath = getDashboardRedirect(role, location.pathname);
  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  /* Role authorization */
  if (requiredRoles.length && !requiredRoles.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}
