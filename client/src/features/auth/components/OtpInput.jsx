/**
 * OtpInput
 * --------
 * Professional 6-digit OTP input component with:
 * - Individual input boxes
 * - Auto-focus on next input
 * - Backspace navigation
 * - Paste support
 * - Keyboard accessible
 */

import { useCallback, useEffect, useRef, useState } from "react";

const OTP_LENGTH = 6;

export function OtpInput({
  value = "",
  onChange,
  disabled = false,
  error = false,
  autoFocus = true,
  length = 6,
}) {
  const actualLength = length || OTP_LENGTH;
  const inputRefs = useRef([]);
  const [localDigits, setLocalDigits] = useState(() =>
    Array(actualLength).fill("")
  );

  // Sync external value with local state
  useEffect(() => {
    const valueStr = String(value || "");
    const newDigits = Array(actualLength).fill("");
    for (let i = 0; i < Math.min(valueStr.length, actualLength); i++) {
      newDigits[i] = valueStr[i] || "";
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalDigits(newDigits);
  }, [value, actualLength]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  const focusInput = useCallback(
    (index) => {
      const clampedIndex = Math.max(0, Math.min(index, actualLength - 1));
      inputRefs.current[clampedIndex]?.focus();
    },
    [actualLength]
  );

  const updateValue = useCallback(
    (newDigits) => {
      setLocalDigits(newDigits);
      const newValue = newDigits.join("");
      onChange?.(newValue);
    },
    [onChange]
  );

  const handleChange = useCallback(
    (index, e) => {
      const inputValue = e.target.value;

      // Handle paste
      if (inputValue.length > 1) {
        const pastedDigits = inputValue
          .replace(/\D/g, "")
          .slice(0, actualLength);
        const newDigits = Array(actualLength).fill("");
        for (let i = 0; i < pastedDigits.length; i++) {
          newDigits[i] = pastedDigits[i];
        }
        updateValue(newDigits);
        focusInput(Math.min(pastedDigits.length, actualLength - 1));
        return;
      }

      // Handle single digit
      const digit = inputValue.replace(/\D/g, "").slice(-1);
      const newDigits = [...localDigits];
      newDigits[index] = digit;
      updateValue(newDigits);

      // Move to next input if digit entered
      if (digit && index < actualLength - 1) {
        focusInput(index + 1);
      }
    },
    [localDigits, focusInput, updateValue, actualLength]
  );

  const handleKeyDown = useCallback(
    (index, e) => {
      switch (e.key) {
        case "Backspace": {
          e.preventDefault();
          const newDigits = [...localDigits];
          if (localDigits[index]) {
            // Clear current digit
            newDigits[index] = "";
            updateValue(newDigits);
          } else if (index > 0) {
            // Move to previous and clear
            newDigits[index - 1] = "";
            updateValue(newDigits);
            focusInput(index - 1);
          }
          break;
        }
        case "ArrowLeft":
          e.preventDefault();
          focusInput(index - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          focusInput(index + 1);
          break;
        case "Delete": {
          e.preventDefault();
          const clearedDigits = [...localDigits];
          clearedDigits[index] = "";
          updateValue(clearedDigits);
          break;
        }
        default:
          break;
      }
    },
    [localDigits, focusInput, updateValue]
  );

  const handlePaste = useCallback(
    (e) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      const pastedDigits = pastedText.replace(/\D/g, "").slice(0, actualLength);

      if (pastedDigits) {
        const newDigits = Array(actualLength).fill("");
        for (let i = 0; i < pastedDigits.length; i++) {
          newDigits[i] = pastedDigits[i];
        }
        updateValue(newDigits);
        focusInput(Math.min(pastedDigits.length, actualLength - 1));
      }
    },
    [focusInput, updateValue, actualLength]
  );

  const handleFocus = useCallback((e) => {
    e.target.select();
  }, []);

  return (
    <div
      className="flex items-center justify-center gap-2 sm:gap-3"
      role="group"
      aria-label="OTP input"
    >
      {localDigits.map((digit, index) => {
        const isFilled = digit !== "";
        const isError = error;

        return (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={actualLength}
            value={digit}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={handleFocus}
            disabled={disabled}
            aria-label={`Digit ${index + 1}`}
            autoComplete="one-time-code"
            style={{
              width: "48px",
              height: "56px",
              minWidth: "48px",
              minHeight: "56px",
            }}
            className={`
              w-12 h-14 sm:w-14 sm:h-16
              text-center text-xl sm:text-2xl font-bold
              rounded-xl
              transition-all duration-200
              focus:outline-none focus:ring-4
              disabled:opacity-50 disabled:cursor-not-allowed
              ${
                isError
                  ? "border-2 border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 focus:border-red-500 focus:ring-red-500/20"
                  : isFilled
                    ? "border-2 border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 focus:border-indigo-500 focus:ring-indigo-500/20"
                    : "border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 dark:focus:border-indigo-400"
              }
            `}
          />
        );
      })}
    </div>
  );
}

export default OtpInput;
