import { Link, useNavigate } from "react-router-dom";
import eduGuardLogo from "../../../assets/eduGuard-logo.png";
import { clearAccessToken } from "../../../core/auth/tokenStorage";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAccessToken();
    navigate("/login/admin");
  };
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/admin" className="flex items-center gap-3">
            <img
              src={eduGuardLogo}
              alt="EduGuard"
              className="h-10 w-10 object-contain"
            />
            <span className="text-lg font-semibold text-slate-900 dark:text-slate-50">
              EduGuard Admin
            </span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-none border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Welcome to the admin panel
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-none border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Total Users
            </h3>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
              0
            </p>
          </div>

          <div className="rounded-none border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Active Users
            </h3>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
              0
            </p>
          </div>

          <div className="rounded-none border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Admins
            </h3>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
              1
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-none border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Quick Actions
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button
              type="button"
              className="rounded-none border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Manage Users
            </button>
            <button
              type="button"
              className="rounded-none border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              View Reports
            </button>
            <button
              type="button"
              className="rounded-none border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
