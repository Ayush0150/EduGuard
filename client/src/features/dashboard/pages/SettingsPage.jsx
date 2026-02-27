/**
 * SettingsPage – Placeholder
 */

import { ChevronRight, Settings } from "lucide-react";
import { Link } from "react-router-dom";

export default function SettingsPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-surface-400 mb-3">
          <Link
            to="/dashboard"
            className="hover:text-brand-500 transition-colors"
          >
            Dashboard
          </Link>
          <ChevronRight size={12} />
          <span className="text-surface-600 dark:text-surface-300">
            Settings
          </span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-surface-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm font-medium text-surface-500">
          System configuration & preferences
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-surface-300 bg-white py-24 dark:border-surface-700 dark:bg-surface-900">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-900/20">
          <Settings size={32} className="text-brand-500" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-surface-800 dark:text-white">
            Coming Soon
          </h3>
          <p className="mt-1 max-w-sm text-sm text-surface-500">
            Configure device settings, alert thresholds, notification
            preferences and system parameters.
          </p>
        </div>
      </div>
    </div>
  );
}
