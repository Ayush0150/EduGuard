/**
 * ToastContainer
 * --------------
 * Global notification system for EduGuard.
 * Used for success, error, warning and info messages.
 */

import { useEffect, useRef, useState } from "react";
import { toastEmitter } from "./toastEmitter";

const TOAST_DURATION = 5000;

/* ---------------------------------------------------
   Toast styles (EduGuard design system)
--------------------------------------------------- */

const toastStyles = {
  success: "border-green-600/30 bg-green-600 text-white dark:bg-green-700",
  error: "border-red-600/30 bg-red-600 text-white dark:bg-red-700",
  info: "border-brand-600/30 bg-brand-600 text-white dark:bg-brand-700",
  warning: "border-amber-600/30 bg-amber-600 text-white dark:bg-amber-700",
};

const toastIcons = {
  success: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
        clipRule="evenodd"
      />
    </svg>
  ),

  error: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
  ),

  info: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  ),

  warning: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

/* ---------------------------------------------------
   Component
--------------------------------------------------- */

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  function dismiss(id) {
    const timer = timersRef.current.get(id);
    if (timer) clearTimeout(timer);

    timersRef.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  useEffect(() => {
    const timers = timersRef.current;

    const unsubscribe = toastEmitter.subscribe((toast) => {
      setToasts((prev) => [...prev, toast]);

      const timer = setTimeout(() => {
        dismiss(toast.id);
      }, TOAST_DURATION);

      timers.set(toast.id, timer);
    });

    return () => {
      unsubscribe();
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex max-w-md flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const type = toast.type || "info";
        const style = toastStyles[type] || toastStyles.info;
        const icon = toastIcons[type] || toastIcons.info;

        return (
          <div
            key={toast.id}
            role="alert"
            className={`pointer-events-auto min-w-[320px] rounded-xl border px-4 py-3.5 shadow-soft backdrop-blur-sm animate-slide-in-right ${style}`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex-shrink-0">{icon}</span>

              <p className="flex-1 text-sm font-medium leading-relaxed">
                {toast.message}
              </p>

              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center text-white/80 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label="Dismiss notification"
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
