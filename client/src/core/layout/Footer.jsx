/**
 * Dashboard Footer
 * ────────────────
 * Clean, enterprise SaaS footer with multi-column layout,
 * quick links, contact info, and version badge.
 */

import { ExternalLink, Globe, Heart, Mail, MapPin, Shield } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getAuthSession } from "../auth/tokenStorage";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

const PRODUCT_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/dashboard/gsm", label: "GSM Monitor" },
  { to: "/dashboard/wifi", label: "WiFi Monitor" },
  { to: "/dashboard/reports", label: "Reports" },
];

const COMPANY_LINKS = [
  { to: "/dashboard/about", label: "About Us" },
  { to: "/dashboard/settings", label: "Settings" },
];

const ADMIN_LINKS = [
  { to: "/admin", label: "Manage Users" },
  { to: "/admin/users/create", label: "Add User" },
  { to: "/admin/suggestions", label: "Suggestions" },
];

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  const location = useLocation();
  const { user } = getAuthSession();
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  return (
    <footer className="mt-auto border-t border-surface-200/60 bg-white dark:border-surface-800/50 dark:bg-surface-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* ── Main grid ── */}
        <div className="grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-900 dark:bg-surface-700">
                <Shield size={14} className="text-white" />
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-surface-900 dark:text-white">
                EduGuard
              </span>
            </div>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-surface-500 dark:text-surface-400">
              Smart College Monitoring System — real-time GSM & WiFi
              surveillance for safer, smarter campuses.
            </p>
            <div className="mt-4 flex items-center gap-1">
              <span className="inline-flex items-center gap-1 rounded-md border border-surface-200/70 bg-surface-50 px-2 py-0.5 text-[10px] font-medium text-surface-500 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-400">
                v1.0.0
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200/50 bg-emerald-50/60 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400">
                <span className="relative flex h-1 w-1">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1 w-1 rounded-full bg-emerald-500" />
                </span>
                Operational
              </span>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-surface-400 dark:text-surface-500">
              Product
            </h4>
            <ul className="mt-3 space-y-2">
              {PRODUCT_LINKS.map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={`text-[13px] font-medium transition-colors duration-150
                      ${
                        location.pathname === to
                          ? "text-surface-900 dark:text-white"
                          : "text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200"
                      }`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company / Admin links */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-surface-400 dark:text-surface-500">
              {isAdmin ? "Administration" : "Company"}
            </h4>
            <ul className="mt-3 space-y-2">
              {(isAdmin ? ADMIN_LINKS : COMPANY_LINKS).map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={`text-[13px] font-medium transition-colors duration-150
                      ${
                        location.pathname === to
                          ? "text-surface-900 dark:text-white"
                          : "text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200"
                      }`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-surface-400 dark:text-surface-500">
              Contact
            </h4>
            <ul className="mt-3 space-y-2.5">
              <li className="flex items-start gap-2">
                <Mail
                  size={13}
                  className="mt-0.5 shrink-0 text-surface-400 dark:text-surface-500"
                />
                <a
                  href="mailto:support@eduguard.io"
                  className="text-[13px] font-medium text-surface-500 transition-colors duration-150 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200"
                >
                  support@eduguard.io
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin
                  size={13}
                  className="mt-0.5 shrink-0 text-surface-400 dark:text-surface-500"
                />
                <span className="text-[13px] font-medium text-surface-500 dark:text-surface-400">
                  Mumbai, MH, India
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Globe
                  size={13}
                  className="mt-0.5 shrink-0 text-surface-400 dark:text-surface-500"
                />
                <a
                  href="https://eduguard.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-surface-500 transition-colors duration-150 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200"
                >
                  eduguard.io
                  <ExternalLink size={10} />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-surface-100 py-5 sm:flex-row dark:border-surface-800/60">
          <p className="text-[12px] text-surface-400 dark:text-surface-500">
            &copy; {CURRENT_YEAR} EduGuard. All rights reserved.
          </p>
          <p className="flex items-center gap-1 text-[12px] text-surface-400 dark:text-surface-500">
            Built with
            <Heart
              size={11}
              className="text-red-400 dark:text-red-500"
              fill="currentColor"
            />
            for safer campuses
          </p>
        </div>
      </div>
    </footer>
  );
}
