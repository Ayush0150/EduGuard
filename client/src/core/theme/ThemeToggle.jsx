/**
 * ThemeToggle
 * ------------
 * Unified dark / light mode switch
 * aligned with EduGuard design system.
 */

import { useEffect, useState } from "react";

const THEME_KEY = "eduguard-theme";
const DARK = "dark";
const LIGHT = "light";

/* -----------------------------------
   Helpers
----------------------------------- */

function getInitialTheme() {
  if (typeof window === "undefined") return LIGHT;

  const stored = localStorage.getItem(THEME_KEY);
  return stored === DARK ? DARK : LIGHT;
}

function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === DARK) root.classList.add(DARK);
  else root.classList.remove(DARK);

  localStorage.setItem(THEME_KEY, theme);
}

/* -----------------------------------
   Icons
----------------------------------- */

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.9" />
      <path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
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
      className="h-3.5 w-3.5"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 8.002-4.248Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

/* -----------------------------------
   Component
----------------------------------- */

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply theme on change
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sync across browser tabs
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === THEME_KEY && e.newValue) {
        setTheme(e.newValue);
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggleTheme() {
    setTheme((prev) => (prev === DARK ? LIGHT : DARK));
  }

  const isDark = theme === DARK;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`group relative inline-flex h-8 w-[3.75rem] items-center rounded-full transition-all duration-300
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2
        focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface-900
        ${
          isDark
            ? "bg-gradient-to-r from-indigo-950 via-surface-900 to-surface-800 shadow-inner shadow-black/40"
            : "bg-gradient-to-r from-sky-100 via-blue-50 to-amber-50 shadow-inner shadow-surface-200/60"
        }
        ${className}`}
    >
      <span className="sr-only">Toggle theme</span>

      {/* Background icons (faded) */}
      <span
        className={`absolute left-2 transition-opacity duration-300 ${
          isDark ? "opacity-40 text-amber-400" : "opacity-0"
        }`}
      >
        <SunIcon />
      </span>
      <span
        className={`absolute right-2 transition-opacity duration-300 ${
          isDark ? "opacity-0" : "opacity-30 text-indigo-400"
        }`}
      >
        <MoonIcon />
      </span>

      {/* Thumb */}
      <span
        className={`pointer-events-none relative z-10 inline-flex h-6 w-6 items-center justify-center rounded-full shadow-lg transition-all duration-300 ease-[cubic-bezier(0.68,-0.2,0.27,1.2)]
          ${
            isDark
              ? "translate-x-[1.875rem] bg-gradient-to-br from-indigo-400 to-violet-500 text-white shadow-indigo-500/30"
              : "translate-x-1 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30"
          }`}
      >
        <span
          className={`transition-transform duration-300 ${isDark ? "rotate-0" : "rotate-90"}`}
        >
          {isDark ? <MoonIcon /> : <SunIcon />}
        </span>
      </span>
    </button>
  );
}
