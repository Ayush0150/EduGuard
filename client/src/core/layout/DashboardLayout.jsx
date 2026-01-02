import { Outlet } from "react-router-dom";
import { useSessionMonitor } from "../auth/useSessionMonitor";
import DashboardNavbar from "./DashboardNavbar";

export default function DashboardLayout() {
  // Monitor session validity and handle expiry
  useSessionMonitor();

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <DashboardNavbar />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
