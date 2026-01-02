import { Link } from "react-router-dom";

export default function AccessDeniedPage() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
        Access denied
      </h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        You don’t have permission to view this page.
      </p>
      <div className="mt-4">
        <Link
          to="/dashboard"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
