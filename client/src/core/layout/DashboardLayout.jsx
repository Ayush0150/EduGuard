/**
 * Dashboard Layout
 * ----------------
 * Enhanced professional layout for authenticated pages.
 */

import { Outlet } from "react-router-dom";
import { useSessionMonitor } from "../auth/useSessionMonitor";
import DashboardNavbar from "./DashboardNavbar";

export default function DashboardLayout() {
  useSessionMonitor();

  return (
    <div className="min-h-screen bg-surface-50 transition-colors duration-300 dark:bg-surface-950">
      <DashboardNavbar />

      <div className="relative">
        {/* Background Decorative Element */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand-600/5 to-transparent dark:from-brand-600/10" />

        <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <footer className="mt-auto border-t border-surface-200 py-6 dark:border-surface-800">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm text-surface-500">
            &copy; {new Date().getFullYear()} EduGuard
          </p>
        </div>
      </footer>
    </div>
  );
}
