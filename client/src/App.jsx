import { lazy, Suspense, useEffect } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { decodeJwt } from "./core/auth/jwt";
import ProtectedRoute from "./core/auth/ProtectedRoute";
import { getAuthSession } from "./core/auth/tokenStorage";
import DashboardLayout from "./core/layout/DashboardLayout";

/* ------------------------------------
   Lazy loaded pages
------------------------------------ */

const LoginPage = lazy(() => import("./features/auth/pages/LoginPage"));

const AdminLoginPage = lazy(
  () => import("./features/auth/pages/AdminLoginPage")
);

const StudentLoginPage = lazy(
  () => import("./features/auth/pages/StudentLoginPage")
);

const ForgotPasswordPage = lazy(
  () => import("./features/auth/pages/ForgotPasswordPage")
);

const VerifyOtpPage = lazy(() => import("./features/auth/pages/VerifyOtpPage"));

const ResetPasswordPage = lazy(
  () => import("./features/auth/pages/ResetPasswordPage")
);

const AccessDeniedPage = lazy(
  () => import("./features/auth/pages/AccessDeniedPage")
);

const DashboardHome = lazy(
  () => import("./features/dashboard/pages/DashboardHome")
);

const AdminDashboard = lazy(
  () => import("./features/dashboard/pages/AdminDashboard")
);

const CreateUser = lazy(() => import("./features/dashboard/pages/CreateUser"));

const EditUser = lazy(() => import("./features/dashboard/pages/EditUser"));

/* ------------------------------------
   Loader
------------------------------------ */

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="text-center">
        <div className="mb-2 inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent" />
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

/* ------------------------------------
   Smart root redirect
------------------------------------ */

function RootRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { token, user, isValid } = getAuthSession();

    if (token && isValid) {
      const role = user?.role ?? decodeJwt(token)?.role;
      const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

      navigate(isAdmin ? "/admin" : "/dashboard", {
        replace: true,
        state: { from: location.pathname },
      });
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate, location.pathname]);

  return <PageLoader />;
}

/* ------------------------------------
   App
------------------------------------ */

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Root */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/admin" element={<AdminLoginPage />} />
        <Route path="/login/student" element={<StudentLoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/admin/verify-otp" element={<VerifyOtpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin/reset-password" element={<ResetPasswordPage />} />

        {/* Protected area */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/access-denied" element={<AccessDeniedPage />} />

            {/* User dashboard */}
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

            {/* Admin dashboard */}
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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
