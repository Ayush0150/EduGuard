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
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-surface-200 bg-surface-100 p-2 shadow-lg dark:border-surface-700 dark:bg-surface-800">
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
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-surface-50 p-4 dark:bg-surface-950">
      {/* Ambient background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-600/[0.03] via-transparent to-brand-400/[0.03] dark:from-brand-600/[0.06] dark:to-brand-400/[0.06]" />

      <div className="relative z-10 w-full max-w-[1100px] animate-scale-in">
        <div className="flex flex-col overflow-hidden border border-surface-200/80 bg-white shadow-xl shadow-surface-900/5 dark:border-surface-800/60 dark:bg-surface-900 dark:shadow-black/20 lg:h-[700px] lg:flex-row">
          {/* LEFT — FORM (50%) */}
          <div className="flex w-full flex-col justify-center p-6 sm:p-8 lg:h-full lg:w-1/2 lg:p-10">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-8">
              <EduGuardMark to={logoLink} />
              <ThemeToggle />
            </div>
            {/* Content */}
            <div className="max-w-sm w-full mx-auto lg:mx-0">
              <header
                className="mb-6 animate-fade-in-up"
                style={{ animationDelay: "100ms", animationFillMode: "both" }}
              >
                <h1 className="text-3xl font-extrabold tracking-tight text-surface-900 dark:text-white sm:text-4xl">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-3 text-base text-surface-500 dark:text-surface-400 leading-relaxed">
                    {subtitle}
                  </p>
                )}
              </header>
              <main
                className="space-y-6 animate-fade-in-up"
                style={{ animationDelay: "200ms", animationFillMode: "both" }}
              >
                {children}
              </main>
            </div>
            {/* Footer intentionally left blank */}
          </div>
          {/* RIGHT — IMAGE (50%) */}
          {backgroundImage && (
            <div className="relative hidden h-full w-full overflow-hidden lg:block lg:w-1/2">
              <img
                src={backgroundImage}
                alt={backgroundAlt}
                className="h-full w-full object-cover animate-fade-in"
                loading="lazy"
                style={{
                  filter: "none",
                  mixBlendMode: "normal",
                  animationDelay: "300ms",
                  animationFillMode: "both",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
