/**
 * Main Application Component
 *
 * Features:
 * - Lazy loading for optimal performance
 * - Protected routes with role-based access control
 * - Auto-redirect based on authentication state
 * - Responsive loading states
 *
 * Route structure:
 * - / → Redirects to /dashboard or /login based on auth
 * - /login → Regular user login
 * - /login/admin → Admin login (ADMIN/SUPER_ADMIN only)
 * - /dashboard → Protected user dashboard
 * - /admin → Protected admin dashboard
 * - /forgot-password → Password reset flow
 */

import { lazy, Suspense, useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { decodeJwt } from "./core/auth/jwt.js";
import ProtectedRoute from "./core/auth/ProtectedRoute.jsx";
import { getAuthSession } from "./core/auth/tokenStorage.js";
import DashboardLayout from "./core/layout/DashboardLayout.jsx";

// Lazy load pages for better initial load performance
const AccessDeniedPage = lazy(() =>
  import("./features/auth/pages/AccessDeniedPage.jsx")
);
const AdminLoginPage = lazy(() =>
  import("./features/auth/pages/AdminLoginPage.jsx")
);
const ForgotPasswordPage = lazy(() =>
  import("./features/auth/pages/ForgotPasswordPage.jsx")
);
const LoginPage = lazy(() => import("./features/auth/pages/LoginPage.jsx"));
const AdminDashboard = lazy(() =>
  import("./features/dashboard/pages/AdminDashboard.jsx")
);
const CreateUser = lazy(() =>
  import("./features/dashboard/pages/CreateUser.jsx")
);
const DashboardHome = lazy(() =>
  import("./features/dashboard/pages/DashboardHome.jsx")
);
const EditUser = lazy(() => import("./features/dashboard/pages/EditUser.jsx"));

// Simple loading fallback
function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <div className="mb-2 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Smart Root Redirect
 * Redirects users to appropriate dashboard based on their role
 */
function RootRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { token, user, isValid } = getAuthSession();

    if (token && isValid) {
      const role = user?.role ?? decodeJwt(token)?.role;
      const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
      const destination = isAdmin ? "/admin" : "/dashboard";
      navigate(destination, { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  return <PageLoader />;
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Root - Smart redirect based on session */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/admin" element={<AdminLoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />

        {/* 🔐 Protected Area - Requires Authentication */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            {/* Access Denied Page */}
            <Route path="/access-denied" element={<AccessDeniedPage />} />

            {/* User Dashboard - Non-Admin Roles Only */}
            <Route
              element={
                <ProtectedRoute
                  requiredRoles={[
                    "USER",
                    "SECURITY",
                    "MAINTENANCE",
                    "PRINCIPAL",
                  ]}
                />
              }
            >
              <Route path="/dashboard" element={<DashboardHome />} />
            </Route>

            {/* Admin Dashboard - Admin Roles Only */}
            <Route
              element={
                <ProtectedRoute requiredRoles={["ADMIN", "SUPER_ADMIN"]} />
              }
            >
              <Route path="/admin">
                <Route index element={<AdminDashboard />} />
                <Route path="users/create" element={<CreateUser />} />
                <Route path="users/:id" element={<EditUser />} />
              </Route>
            </Route>
          </Route>
        </Route>

        {/* Fallback - Redirect to root for smart routing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
