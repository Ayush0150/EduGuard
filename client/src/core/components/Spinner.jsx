/**
 * =====================================================
 * Loading Spinner Component
 * =====================================================
 *
 * Reusable loading indicator for async operations.
 */

export function Spinner({ size = "md", className = "" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
    xl: "h-12 w-12",
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size] || sizeClasses.md} ${className}`}
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

/**
 * Full page loading overlay
 */
export function PageLoader({ message = "Loading..." }) {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4 text-indigo-600" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {message}
        </p>
      </div>
    </div>
  );
}

/**
 * Inline loading state
 */
export function InlineLoader({ message = "Loading..." }) {
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <Spinner size="sm" className="text-indigo-600" />
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {message}
      </span>
    </div>
  );
}

/**
 * Button loading state (to be used inside buttons)
 */
export function ButtonLoader({ text = "Please wait..." }) {
  return (
    <span className="flex items-center gap-2">
      <Spinner size="sm" />
      <span>{text}</span>
    </span>
  );
}

export default Spinner;
