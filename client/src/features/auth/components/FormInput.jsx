export function FormInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  required = false,
  autoComplete,
  inputMode,
  maxLength,
  className = "",
  helpText,
  ...props
}) {
  const inputBaseClass =
    "mt-2 w-full rounded-none border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-colors placeholder:text-slate-400 focus:ring-2 focus:ring-offset-0 focus-visible:outline-none dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500";

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
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={inputClass}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        {...props}
      />
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
