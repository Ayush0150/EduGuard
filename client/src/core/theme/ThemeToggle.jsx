import { useState } from "react";

const THEME_KEY = "eduguard-theme";

function getIsDark() {
  return document.documentElement.classList.contains("dark");
}

function applyIsDark(isDark) {
  if (isDark) document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");

  try {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  } catch {
    // ignore
  }
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M21 14.5A8.5 8.5 0 0 1 9.5 3a6.5 6.5 0 1 0 11.5 11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ThemeToggle({ className = "" }) {
  const [isDark, setIsDark] = useState(() => getIsDark());

  function onToggle() {
    const next = !getIsDark();
    applyIsDark(next);
    setIsDark(next);
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-9 w-16 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
        isDark
          ? "border-slate-900 bg-slate-900 dark:border-slate-700"
          : "border-slate-200 bg-white dark:border-slate-700"
      } ${className}`}
      aria-label={isDark ? "Turn off dark mode" : "Turn on dark mode"}
      aria-pressed={isDark}
    >
      <span className="sr-only">Toggle dark mode</span>
      <span
        className={`pointer-events-none inline-flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-transform duration-200 ${
          isDark
            ? "translate-x-8 border-slate-200 bg-white text-slate-900"
            : "translate-x-1 border-slate-900 bg-slate-900 text-white"
        }`}
      >
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  );
}
