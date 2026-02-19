/**
 * OtpTimer
 * --------
 * Countdown timer component for OTP expiration.
 * Shows mm:ss format with visual feedback.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export function OtpTimer({
  expirySeconds = 300, // 5 minutes default
  onExpire,
  onResend,
  resendCooldown = 30, // Seconds before resend is enabled
  canResend = true,
  resendBusy = false,
}) {
  const [timeLeft, setTimeLeft] = useState(expirySeconds);
  const [resendTimer, setResendTimer] = useState(resendCooldown);
  const intervalRef = useRef(null);
  const resendIntervalRef = useRef(null);
  const onExpireRef = useRef(onExpire);

  // Keep onExpire ref updated
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Calculate isExpired from timeLeft
  const isExpired = timeLeft <= 0;

  // Main countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          // Call onExpire in next tick to avoid setState in render
          setTimeout(() => onExpireRef.current?.(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [timeLeft]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendTimer <= 0) return;

    resendIntervalRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(resendIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(resendIntervalRef.current);
  }, [resendTimer]);

  // Reset timer function
  const resetTimer = useCallback(() => {
    setTimeLeft(expirySeconds);
    setResendTimer(resendCooldown);
  }, [expirySeconds, resendCooldown]);

  // Handle resend click
  const handleResend = useCallback(() => {
    if (resendTimer > 0 || resendBusy) return;
    onResend?.();
    resetTimer();
  }, [resendTimer, resendBusy, onResend, resetTimer]);

  // Format time as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const progressPercent = (timeLeft / expirySeconds) * 100;

  // Color based on time remaining
  const getTimerColor = () => {
    if (isExpired) return "text-red-500 dark:text-red-400";
    if (timeLeft <= 60) return "text-orange-500 dark:text-orange-400";
    return "text-brand-600 dark:text-brand-400";
  };

  const canResendNow = canResend && resendTimer <= 0 && !resendBusy;

  return (
    <div className="space-y-3">
      {/* Timer display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Clock icon */}
          <svg
            className={`h-4 w-4 ${getTimerColor()}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>

          <span className="text-sm font-medium text-surface-600 dark:text-surface-400">
            {isExpired ? "Code expired" : "Expires in"}
          </span>

          <span className={`text-sm font-bold tabular-nums ${getTimerColor()}`}>
            {isExpired ? "0:00" : formatTime(timeLeft)}
          </span>
        </div>

        {/* Resend button */}
        {canResend && (
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResendNow}
            className={`
              text-sm font-semibold transition-colors
              ${
                canResendNow
                  ? "text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  : "text-surface-400 dark:text-surface-600 cursor-not-allowed"
              }
            `}
          >
            {resendBusy ? (
              <span className="flex items-center gap-1.5">
                <svg
                  className="h-3.5 w-3.5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
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
                Sending...
              </span>
            ) : resendTimer > 0 ? (
              `Resend in ${resendTimer}s`
            ) : (
              "Resend OTP"
            )}
          </button>
        )}
      </div>

      {/* Progress bar */}
      {!isExpired && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-200 dark:bg-surface-800">
          <div
            className={`h-full transition-all duration-1000 ease-linear rounded-full ${
              timeLeft <= 60 ? "bg-orange-500" : "bg-brand-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Expired message */}
      {isExpired && (
        <p className="text-sm text-red-500 dark:text-red-400">
          Your verification code has expired. Please request a new one.
        </p>
      )}
    </div>
  );
}

export default OtpTimer;
