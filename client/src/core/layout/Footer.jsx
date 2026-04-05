import {
  Camera,
  GitBranch,
  Globe,
  Mail,
  MapPin,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { getAuthSession } from "../auth/tokenStorage";
import eduGuardLogo from "../../assets/eduGuard-logo.png";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

const COMPANY_LINKS = [
  { to: "/dashboard/about", label: "About Us" },
  { to: "/dashboard/settings", label: "Settings" },
];

const ADMIN_LINKS = [
  { to: "/admin", label: "Manage Users" },
  { to: "/admin/users/create", label: "Add User" },
  { to: "/admin/suggestions", label: "Suggestions" },
];

const SOCIAL_LINKS = [
  { icon: Globe, href: "#", label: "Website" },
  { icon: GitBranch, href: "https://github.com/Ayush0150", label: "GitHub" },
  { icon: Camera, href: "#", label: "Instagram" },
];

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  const location = useLocation();
  const { user } = getAuthSession();
  const isAdmin = ADMIN_ROLES.includes(user?.role);

  return (
    <footer className="mt-auto border-t border-surface-200/60 bg-gradient-to-b from-white/80 via-white/70 to-surface-50/70 backdrop-blur-2xl dark:border-surface-800/50 dark:from-surface-950/80 dark:via-surface-950/70 dark:to-surface-900/70">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* ── Centered Social Icons ── */}
        <div className="flex justify-center pb-1 pt-6">
          <div className="flex items-center gap-5 rounded-2xl border border-surface-200/60 bg-white/70 px-6 py-2 shadow-[0_14px_35px_-26px_rgba(15,23,42,0.65)] dark:border-surface-700/60 dark:bg-surface-900/60">
            {SOCIAL_LINKS.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"
                className="group p-2 text-surface-400 transition-all duration-300 hover:-translate-y-0.5 hover:text-surface-900 dark:text-surface-500 dark:hover:text-white"
              >
                <Icon size={18} className="transition-transform duration-300 group-hover:scale-110" />
              </a>
            ))}
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid gap-9 py-6 sm:grid-cols-2 lg:grid-cols-3 lg:py-7">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-1 lg:justify-self-center lg:translate-x-2 lg:pt-5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-surface-200/80 bg-gradient-to-br from-surface-50 to-surface-100 p-1.5 shadow-sm dark:border-surface-700/60 dark:from-surface-800 dark:to-surface-900">
                <img
                  src={eduGuardLogo}
                  alt="EduGuard"
                  className="h-full w-full object-contain"
                  loading="lazy"
                />
              </div>
              <span className="text-lg font-bold tracking-tight text-surface-900 dark:text-white">
                Edu
                <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
                  Guard
                </span>
              </span>
            </div>
          </div>

          {/* Company / Admin Links */}
          <div className="justify-self-center text-center">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-surface-900 dark:text-surface-100">
              {isAdmin ? "Administration" : "Company"}
            </h4>
            <ul className="mt-5 space-y-3">
              {(isAdmin ? ADMIN_LINKS : COMPANY_LINKS).map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className={`text-[13px] font-medium transition-colors duration-200
                      ${
                        location.pathname === to
                          ? "text-brand-600 dark:text-brand-400"
                          : "text-surface-500 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white"
                      }`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-surface-900 dark:text-surface-100">
              Connect
            </h4>
            <ul className="mt-5 space-y-3.5">
              <li>
                <a
                  href="mailto:eduguard.noreply@gmail.com"
                  className="group flex items-center gap-3 text-[13px] font-medium text-surface-500 transition-colors duration-200 hover:text-surface-900 dark:text-surface-400 dark:hover:text-white"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-100 transition-colors group-hover:bg-brand-50 dark:bg-surface-800/50 dark:group-hover:bg-surface-800">
                    <Mail size={13} className="transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400" />
                  </div>
                  eduguard.noreply@gmail.com
                </a>
              </li>
              <li>
                <div className="group flex items-center gap-3 text-[13px] font-medium text-surface-500 dark:text-surface-400">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800/50">
                    <MapPin size={13} />
                  </div>
                  Mumbai, India
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* ── Bottom Bar ── */}
        <div className="flex items-center justify-center border-t border-surface-200/60 py-3 dark:border-surface-800/60">
          <p className="text-[12px] font-medium text-surface-400 dark:text-surface-500">
            &copy; {CURRENT_YEAR} EduGuard. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
