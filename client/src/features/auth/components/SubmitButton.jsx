/**
 * SubmitButton
 * ------------
 * Primary action button used across all EduGuard
 * authentication flows.
 */

import { forwardRef } from "react";

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export const SubmitButton = forwardRef(function SubmitButton(
  {
    children,
    disabled = false,
    busy = false,
    loadingText = "Please wait...",
    type = "submit",
    className = "",
    ...props
  },
  ref
) {
  const isDisabled = disabled || busy;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={busy}
      className={`group relative flex w-full items-center justify-center rounded-xl bg-brand-600 px-7 py-4 text-lg font-bold text-white shadow-lg transition-all duration-300
        hover:bg-brand-700 hover:shadow-brand-500/25 hover:-translate-y-0.5
        active:translate-y-0 active:scale-[0.98]
        focus:outline-none focus:ring-4 focus:ring-brand-500/20
        disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none
        dark:bg-brand-500 dark:hover:bg-brand-600
        ${className}`}
      {...props}
    >
      {busy ? (
        <span className="flex items-center gap-3">
          <Spinner />
          <span className="text-base font-semibold">{loadingText}</span>
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {children}
          <svg
            className="h-5 w-5 transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </span>
      )}
    </button>
  );
});
