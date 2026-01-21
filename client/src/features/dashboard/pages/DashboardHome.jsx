import { getAuthSession } from "../../../core/auth/tokenStorage";

export default function DashboardHome() {
  const { user } = getAuthSession();

  return (
    <div className="animate-fade-in space-y-6 py-4">
      <section className="rounded-none border border-surface-200 bg-white p-8 shadow-soft dark:border-surface-800 dark:bg-surface-900">
        <h1 className="text-2xl font-extrabold text-surface-900 dark:text-white">
          Welcome, {user?.username || "User"}
        </h1>
        <p className="mt-2 text-sm text-surface-500">
          Your dashboard is ready.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-none border border-surface-200 bg-white p-6 shadow-soft dark:border-surface-800 dark:bg-surface-900">
          <h3 className="text-sm font-semibold text-surface-500">Account</h3>
          <p className="mt-2 text-lg font-bold text-surface-900 dark:text-white">
            {user?.email || ""}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-surface-400">
            {user?.role?.replace("_", " ") || ""}
          </p>
        </div>

        <div className="rounded-none border border-surface-200 bg-white p-6 shadow-soft dark:border-surface-800 dark:bg-surface-900">
          <h3 className="text-sm font-semibold text-surface-500">Status</h3>
          <p className="mt-2 text-lg font-bold text-surface-900 dark:text-white">
            Active
          </p>
          <p className="mt-1 text-xs text-surface-400">
            All services available
          </p>
        </div>
      </div>
    </div>
  );
}
