import { useState } from "react";

function EyeIcon({ open }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-[18px] w-[18px] text-slate-400 transition-colors group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-200"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path
            d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <path
            d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 4l16 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  required = false,
  autoComplete = "current-password",
  helpText,
  className = "",
}) {
  const [showPassword, setShowPassword] = useState(false);

  const inputBaseClass =
    "w-full rounded-none border bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:ring-2 focus:ring-offset-0 focus-visible:outline-none dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500";

  const inputClass = error
    ? `${inputBaseClass} border-red-300 focus:border-red-500 focus:ring-red-500 dark:border-red-900/60`
    : `${inputBaseClass} border-slate-200 focus:border-indigo-600 focus:ring-indigo-600 dark:border-slate-700`;

  const errorId = error ? `${id}-error` : undefined;
  const helpId = helpText && !error ? `${id}-help` : undefined;
  const describedBy = errorId || helpId;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-semibold text-slate-700 dark:text-slate-200"
        >
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <div className="relative mt-2">
        <input
          id={id}
          name={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={inputClass}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="group absolute inset-y-0 right-0 flex items-center px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-0"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          <EyeIcon open={showPassword} />
        </button>
      </div>
      {error && (
        <p id={errorId} className="mt-2 text-xs text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
      {!error && helpText && (
        <p
          id={helpId}
          className="mt-2 text-xs text-slate-500 dark:text-slate-400"
        >
          {helpText}
        </p>
      )}
    </div>
  );
}
