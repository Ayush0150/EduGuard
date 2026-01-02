import { Link } from "react-router-dom";
import { clearAuthSession, getAuthSession } from "../auth/tokenStorage";

export default function DashboardNavbar() {
  const { user } = getAuthSession();
  const role = user?.role;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  function onLogout() {
    // Clear all session data
    clearAuthSession();

    // Determine correct login page based on role
    const loginPath = isAdmin ? "/login/admin" : "/login";

    // Use window.location for complete state reset
    window.location.replace(loginPath);
  }

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link
            to={isAdmin ? "/admin" : "/dashboard"}
            className="text-sm font-semibold text-slate-900 dark:text-slate-100"
          >
            EduGuard
          </Link>

          <nav className="hidden items-center gap-3 sm:flex">
            {!isAdmin && (
              <Link
                to="/dashboard"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                Dashboard
              </Link>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
              {user?.username?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {user?.username ?? "User"}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
