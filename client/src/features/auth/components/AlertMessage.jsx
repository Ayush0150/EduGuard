/**
 * AlertMessage
 * ------------
 * Unified alert component for EduGuard authentication
 * and system feedback messages.
 *
 * Types:
 * - error
 * - success
 * - info
 */

import { forwardRef } from "react";

const ALERT_CONFIG = {
  error: {
    role: "alert",
    styles:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200",
    icon: (
      <svg
        className="h-4 w-4 text-red-600 dark:text-red-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
  },

  success: {
    role: "status",
    styles:
      "border-green-200 bg-green-50 text-green-800 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-200",
    icon: (
      <svg
        className="h-4 w-4 text-green-600 dark:text-green-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },

  info: {
    role: "status",
    styles:
      "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200",
    icon: (
      <svg
        className="h-4 w-4 text-blue-600 dark:text-blue-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
};

export const AlertMessage = forwardRef(function AlertMessage(
  { type = "error", message, onClose, className = "" },
  ref
) {
  if (!message) return null;

  const config = ALERT_CONFIG[type] || ALERT_CONFIG.error;

  return (
    <div
      ref={ref}
      role={config.role}
      aria-live="polite"
      className={`relative rounded-none border p-3 text-sm shadow-sm ${config.styles} ${className}`}
    >
      <div className="flex items-start gap-2">
        {/* Icon */}
        <span className="mt-0.5 flex-shrink-0">{config.icon}</span>

        {/* Message */}
        <p className="flex-1 leading-relaxed">{message}</p>

        {/* Close button */}
        {typeof onClose === "function" && (
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 inline-flex h-7 w-7 items-center justify-center text-current/70 transition hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            aria-label="Dismiss message"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});
