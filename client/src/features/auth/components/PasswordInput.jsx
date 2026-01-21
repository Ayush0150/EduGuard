/**
 * PasswordInput
 * -------------
 * Enterprise-grade secure password input
 * used across EduGuard authentication flows.
 *
 * Design goals:
 * - Clean SaaS experience
 * - Zero layout shift
 * - Accessible visibility toggle
 * - Consistent with FormInput
 */

import { forwardRef, useState } from "react";

function EyeIcon({ open }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      {open ? (
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      ) : (
        <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
      )}
    </svg>
  );
}

const BASE_INPUT =
  "mt-2 w-full rounded-none border bg-surface-50 px-5 py-4 pr-12 text-base leading-relaxed text-surface-900 transition-all duration-200 placeholder:text-surface-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-950/50 dark:text-white dark:placeholder:text-surface-600";

const NORMAL_INPUT =
  "border-surface-200 hover:border-surface-300 focus:border-brand-500 dark:border-surface-800 dark:hover:border-surface-700 dark:focus:border-brand-500";

const ERROR_INPUT =
  "border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-900/60";

export const PasswordInput = forwardRef(function PasswordInput(
  {
    id,
    label,
    value,
    onChange,
    placeholder = "••••••••",
    error,
    required = false,
    autoComplete = "current-password",
    helpText,
    className = "",
    disabled = false,
    ...props
  },
  ref
) {
  const [visible, setVisible] = useState(false);

  const errorId = error ? `${id}-error` : undefined;
  const helpId = helpText && !error ? `${id}-help` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="block text-base font-semibold text-surface-800 dark:text-surface-200 mb-1"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-red-500" aria-hidden>
              *
            </span>
          )}
        </label>
      )}

      {/* Input */}
      <div className="relative">
        <input
          ref={ref}
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={`${BASE_INPUT} ${error ? ERROR_INPUT : NORMAL_INPUT}`}
          {...props}
        />

        {/* Visibility toggle */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-4 text-surface-400 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          <EyeIcon open={visible} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <p
          id={errorId}
          className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
        >
          <svg
            className="h-3.5 w-3.5 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {/* Help text */}
      {!error && helpText && (
        <p
          id={helpId}
          className="text-xs text-surface-500 dark:text-surface-400"
        >
          {helpText}
        </p>
      )}
    </div>
  );
});
