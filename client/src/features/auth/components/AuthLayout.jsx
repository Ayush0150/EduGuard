import { Link } from "react-router-dom";
import eduGuardLogo from "../../../assets/eduGuard-logo.png";
import ThemeToggle from "../../../core/theme/ThemeToggle";

function EduGuardMark() {
  return (
    <Link
      to="/login/admin"
      className="inline-flex h-14 w-14 items-center justify-center transition-opacity hover:opacity-80"
      aria-label="EduGuard Home"
    >
      <img
        src={eduGuardLogo}
        alt="EduGuard"
        className="h-full w-full object-contain"
        loading="eager"
        decoding="async"
      />
    </Link>
  );
}

export function AuthLayout({
  title,
  subtitle,
  backgroundImage,
  backgroundAlt = "Background",
  children,
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 dark:bg-slate-950">
      {/* Subtle professional background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
      >
        {/* Light mode gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-100 to-slate-200 dark:hidden" />

        {/* Dark mode gradient */}
        <div className="absolute inset-0 hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark:block" />

        {/* Soft glow behind card */}
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[140px] dark:bg-indigo-400/10" />
      </div>

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-5xl">
        <div className="grid h-[520px] overflow-hidden border border-slate-200 bg-white shadow-xl lg:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
          {/* Left: Form */}
          <div className="flex flex-col justify-center px-8 py-6">
            <div className="mx-auto w-full max-w-md">
              <div className="flex items-center justify-between">
                <EduGuardMark />
                <ThemeToggle />
              </div>

              <div className="mt-5">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="mt-5">{children}</div>
            </div>
          </div>

          {/* Right: Image */}
          <div className="relative hidden lg:block">
            <img
              src={backgroundImage}
              alt={backgroundAlt}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
            {/* Image overlay for professionalism */}
            <div className="absolute inset-0 bg-black/10 dark:bg-black/30" />
          </div>
        </div>
      </div>
    </div>
  );
}
