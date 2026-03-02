/**
 * FormInput
 * ---------
 * Enterprise-grade unified input component
 * used across all EduGuard authentication & dashboard pages.
 *
 * Design goals:
 * - Clean SaaS look
 * - Strong accessibility
 * - Calm visual hierarchy
 * - Consistent spacing
 * - Professional micro-interactions
 */

import { forwardRef } from "react";

const BASE_INPUT =
  "mt-2 w-full rounded-xl border px-5 py-4 text-base leading-relaxed transition-all duration-200 bg-surface-50 text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-950/50 dark:text-white dark:placeholder:text-surface-600";

const NORMAL_INPUT =
  "border-surface-200 hover:border-surface-300 focus:border-brand-500 dark:border-surface-800 dark:hover:border-surface-700 dark:focus:border-brand-500";

const ERROR_INPUT =
  "border-red-400 focus:border-red-500 focus:ring-red-500/15 dark:border-red-900/60";

export const FormInput = forwardRef(function FormInput(
  {
    id,
    label,
    type = "text",
    value,
    onChange,
    placeholder,
    error,
    required = false,
    autoComplete,
    inputMode,
    maxLength,
    helpText,
    disabled = false,
    className = "",
    ...props
  },
  ref
) {
  const errorId = error ? `${id}-error` : undefined;
  const helpId = helpText && !error ? `${id}-help` : undefined;

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
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId || helpId}
          className={`${BASE_INPUT} ${error ? ERROR_INPUT : NORMAL_INPUT}`}
          {...props}
        />
      </div>

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
        >
          <svg
            className="h-3.5 w-3.5 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
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
