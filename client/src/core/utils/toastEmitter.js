/**
 * Toast Emitter
 * -------------
 * Lightweight event-based notification system.
 *
 * Framework-agnostic (no React dependency).
 * Designed to be consumed by ToastContainer.
 */

let toastId = Date.now();

/* ---------------------------------------------------
   Internal listeners
--------------------------------------------------- */

const listeners = new Set();

/* ---------------------------------------------------
   Emitter
--------------------------------------------------- */

export const toastEmitter = {
  subscribe(listener) {
    if (typeof listener !== "function") return () => {};

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },

  emit(payload) {
    listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch {
        // Prevent one broken listener from breaking others
      }
    });
  },
};

/* ---------------------------------------------------
   Public API
--------------------------------------------------- */

export function toast(message, type = "info", options = {}) {
  if (!message) return;

  toastEmitter.emit({
    id: ++toastId,
    message: String(message),
    type,
    ...options,
  });
}

/* ---------------------------------------------------
   Shortcut helpers
--------------------------------------------------- */

toast.success = (message, options) => toast(message, "success", options);

toast.error = (message, options) => toast(message, "error", options);

toast.info = (message, options) => toast(message, "info", options);

toast.warning = (message, options) => toast(message, "warning", options);
