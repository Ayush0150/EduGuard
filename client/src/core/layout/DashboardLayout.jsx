/**
 * Dashboard Layout
 * ----------------
 * Stable layout shell — navbar, gradient wash, footer.
 * Page-level entrance animations are handled by AnimatedPage inside each route.
 */

import { Outlet } from "react-router-dom";
import { useSessionMonitor } from "../auth/useSessionMonitor";
import DashboardNavbar from "./DashboardNavbar";
import Footer from "./Footer";

export default function DashboardLayout() {
  useSessionMonitor();

  return (
    <div className="flex min-h-screen flex-col bg-surface-50 transition-colors duration-300 dark:bg-surface-950">
      <DashboardNavbar />

      <div className="relative flex-1">
        {/* Subtle top gradient wash */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-brand-600/[0.03] to-transparent dark:from-brand-600/[0.06]" />

        <main className="relative mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <Footer />
    </div>
  );
}
