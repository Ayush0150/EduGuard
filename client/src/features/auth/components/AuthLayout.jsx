/**
 * AuthLayout
 * ----------
 * Height-optimized authentication layout
 * (prevents vertical scrolling on login pages)
 */

import { Link } from "react-router-dom";
import eduGuardLogo from "../../../assets/eduGuard-logo.png";
import ThemeToggle from "../../../core/theme/ThemeToggle";

function EduGuardMark({ to = "/login" }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 transition-all hover:opacity-90 group"
      aria-label="EduGuard Home"
    >
      <div className="h-14 w-14 overflow-hidden rounded-lg bg-white p-2 shadow-lg border border-surface-200 flex items-center justify-center">
        <img
          src={eduGuardLogo}
          alt="EduGuard"
          className="h-full w-full object-contain"
          loading="eager"
        />
      </div>
      <span className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white">
        Edu<span className="text-brand-600">Guard</span>
      </span>
    </Link>
  );
}

export function AuthLayout({
  title = "",
  subtitle = "",
  backgroundImage,
  backgroundAlt = "Authentication illustration",
  logoLink = "/login",
  children,
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface-50 p-4 dark:bg-surface-950">
      <div className="relative z-10 w-full max-w-[1100px] animate-fade-in">
        <div className="flex flex-col lg:flex-row overflow-hidden rounded-none border border-surface-200 bg-white shadow-soft dark:border-surface-800 dark:bg-surface-900">
          {/* LEFT — FORM (50%) */}
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10 min-h-[640px] w-full lg:w-1/2">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-8">
              <EduGuardMark to={logoLink} />
              <ThemeToggle />
            </div>
            {/* Content */}
            <div className="max-w-sm w-full mx-auto lg:mx-0">
              <header className="mb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white sm:text-4xl">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-3 text-base text-surface-500 dark:text-surface-400 leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </header>
              <main className="space-y-6">{children}</main>
            </div>
            {/* Footer intentionally left blank */}
          </div>
          {/* RIGHT — IMAGE (50%) */}
          {backgroundImage && (
            <div className="relative hidden lg:block w-full lg:w-1/2">
              <img
                src={backgroundImage}
                alt={backgroundAlt}
                className="h-full w-full object-cover rounded-none"
                loading="lazy"
                style={{ filter: "none", mixBlendMode: "normal" }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
