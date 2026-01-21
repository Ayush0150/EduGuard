/**
 * AccessDeniedPage
 * ----------------
 * Displayed when user lacks permission for a route.
 */

import { Link } from "react-router-dom";

export default function AccessDeniedPage({
  redirectTo = "/dashboard",
  title = "Access denied",
  message = "You don’t have permission to view this page.",
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-lg animate-fade-in rounded-none border border-surface-200 bg-white p-10 text-center shadow-soft dark:border-surface-800 dark:bg-surface-900">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
          <svg
            className="h-8 w-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          {title}
        </h1>

        <p className="mt-3 text-base leading-relaxed text-surface-600 dark:text-surface-400">
          {message}
        </p>

        <div className="mt-8">
          <Link
            to={redirectTo}
            className="inline-flex items-center justify-center gap-2 rounded-none bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-900"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
