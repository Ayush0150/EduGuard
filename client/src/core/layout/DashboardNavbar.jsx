/**
 * Dashboard Navbar
 * ----------------
 * Enhanced role-aware professional top navigation.
 */

import { Link, useNavigate } from "react-router-dom";
import eduGuardLogo from "../../assets/eduGuard-logo.png";
import { clearAuthSession, getAuthSession } from "../auth/tokenStorage";
import ThemeToggle from "../theme/ThemeToggle";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export default function DashboardNavbar() {
  const navigate = useNavigate();
  const { user } = getAuthSession();

  const role = user?.role;
  const isAdmin = ADMIN_ROLES.includes(role);

  function handleLogout() {
    clearAuthSession();
    navigate(isAdmin ? "/login/admin" : "/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-50 border-b border-surface-200 bg-white/80 backdrop-blur-md transition-all dark:border-surface-800 dark:bg-surface-950/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Branding & Nav */}
        <div className="flex items-center gap-10">
          <Link
            to={isAdmin ? "/admin" : "/dashboard"}
            className="group flex items-center gap-2"
          >
            <div className="h-9 w-9 overflow-hidden rounded-none bg-brand-600 p-1.5 shadow-brand-500/20 shadow-lg transition-transform group-hover:scale-105">
              <img
                src={eduGuardLogo}
                alt="EduGuard"
                className="h-full w-full object-contain brightness-0 invert"
                loading="eager"
              />
            </div>
            <span className="text-xl font-bold tracking-tight text-surface-900 dark:text-white">
              Edu<span className="text-brand-600">Guard</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {!isAdmin ? (
              <NavLink to="/dashboard">Dashboard</NavLink>
            ) : (
              <>
                <NavLink to="/admin">Users</NavLink>
                <NavLink to="/admin/users/create">Add user</NavLink>
              </>
            )}
          </nav>
        </div>

        {/* Right: Profile & Actions */}
        <div className="flex items-center gap-4">
          <ThemeToggle />

          <div className="h-8 w-px bg-surface-200 dark:bg-surface-800" />

          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end sm:flex">
              <span className="text-sm font-bold text-surface-900 dark:text-white leading-none">
                {user?.username ?? "User"}
              </span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 leading-none">
                {role?.replace("_", " ")}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="group relative h-10 w-10 overflow-hidden rounded-none bg-surface-100 transition-all hover:bg-red-50 dark:bg-surface-800 dark:hover:bg-red-900/20"
              title="Logout"
            >
              <span className="flex items-center justify-center transition-transform group-hover:scale-110">
                <svg
                  className="h-5 w-5 text-surface-600 group-hover:text-red-600 dark:text-surface-400 dark:group-hover:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, children }) {
  return (
    <Link
      to={to}
      className="rounded-none px-4 py-2 text-sm font-semibold text-surface-600 transition-all hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-white"
    >
      {children}
    </Link>
  );
}
