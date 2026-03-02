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
    <div className="flex h-screen items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="animate-scale-in text-center">
        <div className="relative mx-auto mb-5 h-12 w-12">
          <Spinner size="lg" className="text-brand-600 dark:text-brand-400" />
          <div className="absolute inset-0 animate-ping rounded-full bg-brand-500/10" />
        </div>
        <p
          className="animate-fade-in-up text-sm font-semibold text-surface-500 dark:text-surface-400"
          style={{ animationDelay: "200ms", animationFillMode: "both" }}
        >
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
    <div className="flex items-center justify-center gap-2.5 py-8 animate-fade-in">
      <Spinner size="sm" className="text-brand-600 dark:text-brand-400" />
      <span className="text-sm font-medium text-surface-500 dark:text-surface-400">
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
