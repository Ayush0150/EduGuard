/**
 * PasswordConfirmModal
 * --------------------
 * Reusable modal that gates destructive / critical actions
 * behind the current user's password verification.
 *
 * Usage:
 *   <PasswordConfirmModal
 *     open={showModal}
 *     title="Reset Report Data"
 *     description="All event history will be permanently deleted."
 *     confirmLabel="Reset Data"
 *     onConfirm={handleReset}   // called only after password verified
 *     onCancel={() => setShowModal(false)}
 *   />
 */

import { AlertTriangle, Eye, EyeOff, Loader2, Lock, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { verifyCurrentPassword } from "../../features/auth/api/authApi";

export default function PasswordConfirmModal({
  open,
  title = "Confirm Action",
  description = "Please enter your password to continue.",
  confirmLabel = "Confirm",
  variant = "danger", // "danger" | "warning"
  onConfirm,
  onCancel,
}) {
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef(null);

  /* Focus input when modal opens */
  useEffect(() => {
    if (open) {
      setPassword("");
      setShowPwd(false);
      setError("");
      setVerifying(false);
      // slight delay to ensure DOM is ready
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!password.trim()) {
        setError("Password is required");
        return;
      }
      setError("");
      setVerifying(true);
      try {
        await verifyCurrentPassword(password);
        // Password correct — invoke the confirmed action
        await onConfirm?.();
        onCancel?.(); // close modal after success
      } catch (err) {
        const msg =
          err?.response?.data?.message || err?.message || "Verification failed";
        setError(msg);
      } finally {
        setVerifying(false);
      }
    },
    [password, onConfirm, onCancel]
  );

  if (!open) return null;

  const btnColor =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
      : "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500";

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-surface-200 bg-white p-6 shadow-2xl dark:border-surface-700 dark:bg-surface-900">
        {/* Close */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800 dark:hover:text-surface-300"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              variant === "danger"
                ? "bg-red-100 dark:bg-red-900/30"
                : "bg-amber-100 dark:bg-amber-900/30"
            }`}
          >
            <AlertTriangle
              size={20}
              className={
                variant === "danger"
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
              }
            />
          </div>
          <div>
            <h3 className="text-lg font-bold text-surface-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-0.5 text-sm text-surface-500">{description}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password field */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-surface-500">
              <Lock size={12} />
              Current Password
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={verifying}
                className="w-full rounded-lg border border-surface-200 bg-surface-50 py-2.5 pl-3 pr-10 text-sm font-medium text-surface-800 outline-none transition-colors placeholder:text-surface-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-600 disabled:opacity-50"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle size={13} />
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={verifying}
              className="rounded-lg px-4 py-2 text-sm font-bold text-surface-600 transition-colors hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={verifying || !password.trim()}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-surface-900 disabled:opacity-50 disabled:cursor-not-allowed ${btnColor}`}
            >
              {verifying ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Lock size={15} />
              )}
              {verifying ? "Verifying…" : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
