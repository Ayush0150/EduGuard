/**
 * Dashboard Navbar
 * ────────────────
 * Enterprise-grade SaaS top navigation inspired by
 * Linear, Stripe, and Notion. Clean, minimal, premium.
 */

import {
  Activity,
  BarChart3,
  ChevronDown,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  Radio,
  Settings,
  UserPlus,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import eduGuardLogo from "../../assets/eduGuard-logo.png";
import { clearAuthSession, getAuthSession } from "../auth/tokenStorage";
import ThemeToggle from "../theme/ThemeToggle";

/* ═══════════════════════════════════════════
   Constants
═══════════════════════════════════════════ */

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

const USER_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Live Status",
    icon: Activity,
    children: [
      { to: "/dashboard/gsm", label: "GSM Monitor", icon: Radio },
      { to: "/dashboard/wifi", label: "WiFi Monitor", icon: Wifi },
    ],
  },
  { to: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { to: "/dashboard/settings", label: "Settings", icon: Settings },
  { to: "/dashboard/about", label: "About Us", icon: Info },
];

const ADMIN_NAV = [
  { to: "/admin", label: "Users", icon: Users },
  { to: "/admin/users/create", label: "Add User", icon: UserPlus },
  { to: "/admin/suggestions", label: "Suggestions", icon: MessageSquareText },
];

/* ═══════════════════════════════════════════
   Hooks
═══════════════════════════════════════════ */

function useClickOutside(ref, handler) {
  useEffect(() => {
    function onPointer(e) {
      if (ref.current && !ref.current.contains(e.target)) handler();
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [ref, handler]);
}

/** Detect if header has scrolled past threshold */
function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/* ═══════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════ */

/** Desktop nav link — clean, minimal active/hover indicator */
function NavItem({ to, label, icon: Icon, active }) {
  return (
    <Link
      to={to}
      className={`group relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200
        ${
          active
            ? "text-surface-900 dark:text-white"
            : "text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200"
        }`}
    >
      {Icon && (
        <Icon
          size={16}
          strokeWidth={active ? 2.2 : 1.8}
          className={`transition-colors duration-200 ${
            active
              ? "text-brand-600 dark:text-brand-400"
              : "text-surface-400 group-hover:text-surface-600 dark:text-surface-500 dark:group-hover:text-surface-300"
          }`}
        />
      )}
      {label}
      {/* Bottom indicator bar */}
      <span
        className={`absolute -bottom-[17px] left-2 right-2 h-[2px] rounded-full transition-all duration-300
          ${
            active
              ? "scale-x-100 bg-brand-600 dark:bg-brand-400"
              : "scale-x-0 bg-surface-300 group-hover:scale-x-100 dark:bg-surface-600"
          }`}
      />
    </Link>
  );
}

/** Desktop dropdown — refined */
function NavDropdown({ label, icon: Icon, items, pathname }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close);

  const isChildActive = items.some((i) => pathname === i.to);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`group relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200
          ${
            isChildActive
              ? "text-surface-900 dark:text-white"
              : "text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200"
          }`}
      >
        {Icon && (
          <Icon
            size={16}
            strokeWidth={isChildActive ? 2.2 : 1.8}
            className={`transition-colors duration-200 ${
              isChildActive
                ? "text-brand-600 dark:text-brand-400"
                : "text-surface-400 group-hover:text-surface-600 dark:text-surface-500 dark:group-hover:text-surface-300"
            }`}
          />
        )}
        {label}
        <ChevronDown
          size={13}
          className={`ml-0.5 text-surface-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
        <span
          className={`absolute -bottom-[17px] left-2 right-2 h-[2px] rounded-full transition-all duration-300
            ${
              isChildActive
                ? "scale-x-100 bg-brand-600 dark:bg-brand-400"
                : "scale-x-0 bg-surface-300 group-hover:scale-x-100 dark:bg-surface-600"
            }`}
        />
      </button>

      {/* Dropdown */}
      <div
        className={`absolute left-0 top-full z-50 mt-3 w-52 origin-top-left rounded-xl border border-surface-200/80 bg-white p-1 shadow-lg shadow-surface-900/[0.04] transition-all duration-200 dark:border-surface-700/70 dark:bg-surface-900 dark:shadow-black/30
          ${open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}
      >
        {items.map(({ to, label: l, icon: ItemIcon }) => (
          <Link
            key={to}
            to={to}
            onClick={close}
            className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors duration-150
              ${
                pathname === to
                  ? "bg-surface-100 text-surface-900 dark:bg-surface-800/70 dark:text-white"
                  : "text-surface-600 hover:bg-surface-50 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800/50 dark:hover:text-white"
              }`}
          >
            {ItemIcon && (
              <ItemIcon
                size={15}
                className={
                  pathname === to
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-surface-400 dark:text-surface-500"
                }
              />
            )}
            {l}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Profile dropdown — enterprise card style */
function ProfileDropdown({ user, role, isAdmin, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close);

  const initials = (user?.username ?? "U").slice(0, 2).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-all duration-200 hover:bg-surface-100 dark:hover:bg-surface-800/50"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 text-xs font-bold text-white shadow-sm shadow-brand-600/20 transition-shadow duration-200 group-hover:shadow-md group-hover:shadow-brand-600/25 dark:from-brand-500 dark:to-brand-700">
          {initials}
        </div>
        <div className="hidden flex-col items-start sm:flex">
          <span className="text-sm font-semibold leading-tight text-surface-800 dark:text-surface-200">
            {user?.username ?? "User"}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-600/70 dark:text-brand-400/70">
            {role?.replace("_", " ")}
          </span>
        </div>
        <ChevronDown
          size={13}
          className={`hidden text-surface-400 transition-transform duration-200 sm:block ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-xl border border-surface-200/80 bg-white p-1 shadow-lg shadow-surface-900/[0.04] transition-all duration-200 dark:border-surface-700/70 dark:bg-surface-900 dark:shadow-black/30
          ${open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}
      >
        {/* User info */}
        <div className="mb-1 rounded-lg bg-surface-50 px-3 py-2.5 dark:bg-surface-800/50">
          <p className="text-[13px] font-semibold text-surface-900 dark:text-white">
            {user?.username ?? "User"}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-surface-500 dark:text-surface-400">
            {user?.email ?? role?.replace("_", " ")}
          </p>
        </div>

        <Link
          to={isAdmin ? "/admin" : "/dashboard/settings"}
          onClick={close}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-surface-600 transition-colors duration-150 hover:bg-surface-50 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800/50 dark:hover:text-white"
        >
          <Settings
            size={15}
            className="text-surface-400 dark:text-surface-500"
          />
          Settings
        </Link>

        <div className="my-1 h-px bg-surface-100 dark:bg-surface-800" />

        <button
          onClick={() => {
            close();
            onLogout();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <LogOut size={15} />
          Log out
        </button>
      </div>
    </div>
  );
}

/** Mobile drawer link */
function MobileLink({ to, label, icon: Icon, active, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors duration-150
        ${
          active
            ? "bg-surface-100 text-surface-900 dark:bg-surface-800/70 dark:text-white"
            : "text-surface-600 hover:bg-surface-50 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800/50 dark:hover:text-white"
        }`}
    >
      <Icon
        size={17}
        className={
          active
            ? "text-brand-600 dark:text-brand-400"
            : "text-surface-400 dark:text-surface-500"
        }
      />
      {label}
    </Link>
  );
}

/* ═══════════════════════════════════════════
   Main Navbar
═══════════════════════════════════════════ */

export default function DashboardNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = getAuthSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = useScrolled();

  const role = user?.role;
  const isAdmin = ADMIN_ROLES.includes(role);
  const navItems = isAdmin ? ADMIN_NAV : USER_NAV;

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function handleLogout() {
    clearAuthSession();
    navigate(isAdmin ? "/login/admin" : "/login", { replace: true });
  }

  return (
    <>
      <header
        className={`sticky top-0 z-50 border-b bg-white/80 backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 dark:bg-surface-950/80
          ${
            scrolled
              ? "border-surface-200/80 shadow-sm shadow-surface-900/[0.03] dark:border-surface-800/60 dark:shadow-black/10"
              : "border-transparent"
          }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* ── Left: Logo + Nav ── */}
          <div className="flex items-center gap-8">
            <Link
              to={isAdmin ? "/admin" : "/dashboard"}
              className="group flex items-center gap-2.5"
            >
              <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-surface-200/80 bg-gradient-to-br from-surface-50 to-surface-100 p-1.5 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:shadow-brand-500/10 dark:border-surface-700/60 dark:from-surface-800 dark:to-surface-900">
                <img
                  src={eduGuardLogo}
                  alt="EduGuard"
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110"
                  loading="eager"
                />
              </div>
              <span className="text-base font-bold tracking-tight text-surface-900 dark:text-white">
                Edu
                <span className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">
                  Guard
                </span>
              </span>
            </Link>

            {/* Desktop nav — hidden below lg */}
            <nav
              className="hidden items-center gap-0.5 lg:flex"
              role="navigation"
            >
              {navItems.map((item) =>
                item.children ? (
                  <NavDropdown
                    key={item.label}
                    label={item.label}
                    icon={item.icon}
                    items={item.children}
                    pathname={location.pathname}
                  />
                ) : (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    active={location.pathname === item.to}
                  />
                )
              )}
            </nav>
          </div>

          {/* ── Right: Actions ── */}
          <div className="flex items-center gap-2">
            {/* Live badge */}
            <div className="mr-0.5 hidden items-center gap-1.5 rounded-full border border-emerald-200/50 bg-emerald-50/60 px-2.5 py-1 lg:flex dark:border-emerald-900/30 dark:bg-emerald-950/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                Live
              </span>
            </div>

            <ThemeToggle className="mr-0.5" />

            <div className="hidden h-6 w-px bg-surface-200/80 sm:block dark:bg-surface-700/50" />

            <ProfileDropdown
              user={user}
              role={role}
              isAdmin={isAdmin}
              onLogout={handleLogout}
            />

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-surface-600 transition-colors hover:bg-surface-100 lg:hidden dark:text-surface-400 dark:hover:bg-surface-800"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile overlay ── */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden
          ${mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Mobile drawer ── */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-[280px] max-w-[85vw] flex-col border-l border-surface-200/60 bg-white shadow-xl transition-transform duration-300 ease-out lg:hidden dark:border-surface-800/60 dark:bg-surface-950
          ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-surface-100 px-4 py-3.5 dark:border-surface-800">
          <Link
            to={isAdmin ? "/admin" : "/dashboard"}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-100 p-0.5 dark:bg-surface-800">
              <img
                src={eduGuardLogo}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-sm font-semibold text-surface-900 dark:text-white">
              EduGuard
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer links */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {navItems.map((item) =>
            item.children ? (
              <div key={item.label} className="space-y-0.5">
                <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-widest text-surface-400 dark:text-surface-500">
                  {item.label}
                </p>
                {item.children.map((child) => (
                  <MobileLink
                    key={child.to}
                    to={child.to}
                    label={child.label}
                    icon={child.icon}
                    active={location.pathname === child.to}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </div>
            ) : (
              <MobileLink
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                active={location.pathname === item.to}
                onClick={() => setMobileOpen(false)}
              />
            )
          )}
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-surface-100 p-3 dark:border-surface-800">
          <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-surface-50 px-3 py-2 dark:bg-surface-800/50">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-900 text-[11px] font-bold text-white dark:bg-surface-700">
              {(user?.username ?? "U").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-surface-900 dark:text-white">
                {user?.username ?? "User"}
              </p>
              <p className="truncate text-[11px] font-medium text-surface-400 dark:text-surface-500">
                {role?.replace("_", " ")}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setMobileOpen(false);
              handleLogout();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200/60 px-3 py-2 text-[13px] font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <LogOut size={15} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
