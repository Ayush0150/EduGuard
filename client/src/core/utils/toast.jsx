import { useEffect, useState } from "react";
import { toastEmitter } from "./toastEmitter";

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = toastEmitter.subscribe((toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4000);
    });

    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md"
      style={{ pointerEvents: "none" }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            min-w-[320px] rounded-lg px-4 py-3.5 shadow-xl backdrop-blur-sm
            flex items-start gap-3 animate-in slide-in-from-top-2 fade-in
            ${
              t.type === "success"
                ? "bg-green-50/95 dark:bg-green-900/40 border-2 border-green-300 dark:border-green-700"
                : t.type === "error"
                ? "bg-red-50/95 dark:bg-red-900/40 border-2 border-red-300 dark:border-red-700"
                : t.type === "warning"
                ? "bg-amber-50/95 dark:bg-amber-900/40 border-2 border-amber-300 dark:border-amber-700"
                : "bg-blue-50/95 dark:bg-blue-900/40 border-2 border-blue-300 dark:border-blue-700"
            }
          `}
          style={{ pointerEvents: "auto" }}
        >
          <div className="flex-shrink-0 mt-0.5">
            {t.type === "success" ? (
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : t.type === "error" ? (
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : t.type === "warning" ? (
              <svg
                className="w-5 h-5 text-amber-600 dark:text-amber-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
          <p
            className={`
              text-sm font-medium flex-1 leading-relaxed
              ${
                t.type === "success"
                  ? "text-green-900 dark:text-green-100"
                  : t.type === "error"
                  ? "text-red-900 dark:text-red-100"
                  : t.type === "warning"
                  ? "text-amber-900 dark:text-amber-100"
                  : "text-blue-900 dark:text-blue-100"
              }
            `}
          >
            {t.message}
          </p>
        </div>
      ))}
    </div>
  );
}
