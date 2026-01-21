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
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
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
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        d="M21 14.5A8.5 8.5 0 0 1 9.5 3a6.5 6.5 0 1 0 11.5 11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
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
      className={`relative inline-flex h-9 w-16 items-center rounded-none border transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2
        focus-visible:ring-offset-white dark:focus-visible:ring-offset-surface-900
        ${
          isDark
            ? "border-surface-800 bg-surface-900"
            : "border-surface-200 bg-white"
        }
        ${className}`}
    >
      <span className="sr-only">Toggle theme</span>

      <span
        className={`pointer-events-none inline-flex h-7 w-7 items-center justify-center border transition-transform duration-200
          ${
            isDark
              ? "translate-x-8 border-surface-200 bg-white text-surface-900"
              : "translate-x-1 border-surface-900 bg-surface-900 text-white"
          }`}
      >
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  );
}
