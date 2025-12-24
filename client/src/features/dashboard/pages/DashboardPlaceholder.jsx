import ThemeToggle from "../../../core/theme/ThemeToggle";

export default function DashboardPlaceholder() {
  return (
    <div className="min-h-screen bg-slate-100 p-6 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-sm dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            EduGuard Dashboard
          </h1>
          <ThemeToggle />
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Login succeeded. Next phases will add alerts, requests, and monitoring
          views.
        </p>
      </div>
    </div>
  );
}
