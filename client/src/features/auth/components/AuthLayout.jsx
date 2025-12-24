import { Link } from "react-router-dom";
import eduGuardLogo from "../../../assets/eduGuard-logo.png";
import ThemeToggle from "../../../core/theme/ThemeToggle";

function EduGuardMark() {
  return (
    <Link
      to="/login/admin"
      className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-none transition-opacity hover:opacity-80"
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
    <div className="flex min-h-[100dvh] items-start bg-slate-100 px-4 py-6 sm:items-center sm:p-8 lg:p-10 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid w-full overflow-hidden rounded-none border border-slate-200 bg-white shadow-lg lg:min-h-[min(640px,calc(100dvh-6rem))] lg:grid-cols-2 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="p-6 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-md">
              <div className="flex items-center justify-between gap-4">
                <EduGuardMark />
                <ThemeToggle />
              </div>

              <div className="mt-6 sm:mt-8">
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-50">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="mt-6 sm:mt-8">{children}</div>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <img
              src={backgroundImage}
              alt={backgroundAlt}
              className="h-full w-full object-cover filter saturate-110 contrast-110 brightness-105 dark:saturate-100 dark:contrast-125 dark:brightness-75"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
