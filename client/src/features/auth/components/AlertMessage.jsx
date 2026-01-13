export function AlertMessage({ type = "error", message }) {
  if (!message) return null;

  const styles = {
    error:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200",
    success:
      "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200",
    info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200",
  };

  const icons = {
    error: "⚠️",
    success: "✓",
    info: "ℹ️",
  };

  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`rounded-lg border p-3 ${styles[type]}`}
    >
      <p className="flex items-start gap-2 text-xs sm:text-sm leading-relaxed">
        <span className="mt-0.5 select-none text-base" aria-hidden="true">
          {icons[type]}
        </span>
        <span className="flex-1">{message}</span>
      </p>
    </div>
  );
}
