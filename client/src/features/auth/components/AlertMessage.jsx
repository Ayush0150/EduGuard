export function AlertMessage({ type = "error", message }) {
  if (!message) return null;

  const styles = {
    error: "text-red-600 dark:text-red-400",
    success: "text-green-600 dark:text-green-400",
    info: "text-slate-600 dark:text-slate-300",
  };

  const icons = {
    error: "⚠️",
    success: "✓",
    info: "ℹ️",
  };

  return (
    <p
      role={type === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`flex items-center gap-2 text-xs sm:text-sm leading-tight ${styles[type]}`}
    >
      <span className="select-none">{icons[type]}</span>
      <span>{message}</span>
    </p>
  );
}
