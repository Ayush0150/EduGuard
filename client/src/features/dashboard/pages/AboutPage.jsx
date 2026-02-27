/**
 * AboutPage – Premium Professional About & Feedback
 * ──────────────────────────────────────────────────
 * Sections:
 *  1. Hero banner with project identity
 *  2. Project overview cards
 *  3. Tech stack showcase
 *  4. Developer profile
 *  5. Suggestion / feedback form (persisted to DB)
 *  6. Contact information
 */

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Database,
  ExternalLink,
  Globe,
  GraduationCap,
  Heart,
  Layers,
  Loader2,
  Mail,
  MessageSquarePlus,
  Microchip,
  Monitor,
  Radio,
  Send,
  Server,
  Shield,
  Sparkles,
  Star,
  User,
  Wifi,
  Zap,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";

/* ════════════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════════════ */

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  `http://${window.location.hostname}:8080`;

const PROJECT_VERSION = "1.0.0";

const FEATURES = [
  {
    icon: Radio,
    title: "Real-Time Monitoring",
    desc: "Live telemetry from ESP32 with 1-second classroom updates via WebSocket",
    color: "brand",
  },
  {
    icon: Shield,
    title: "Emergency Response",
    desc: "Instant emergency alerts with SMS notifications and automated missed calls",
    color: "red",
  },
  {
    icon: Activity,
    title: "Smart Attendance",
    desc: "PIR-based teacher detection with grace period, manual override, and absence tracking",
    color: "violet",
  },
  {
    icon: AlertTriangle,
    title: "Environmental Safety",
    desc: "Gas sensor monitoring with hysteresis, washroom alerts, and AC request system",
    color: "amber",
  },
  {
    icon: Database,
    title: "Persistent Reports",
    desc: "All events stored in MongoDB — exportable as Excel, PDF, CSV, or JSON",
    color: "emerald",
  },
  {
    icon: Globe,
    title: "Web Dashboard",
    desc: "Responsive React dashboard with dark mode, live event feed, and analytics",
    color: "blue",
  },
];

const TECH_STACK = [
  {
    category: "Hardware",
    icon: Microchip,
    color: "from-orange-500 to-amber-600",
    items: [
      "ESP32 Microcontroller",
      "SIM800L GSM Module",
      "DS3231 RTC",
      "PIR Motion Sensor",
      "MQ Gas Sensor",
      "Buzzer & LEDs",
    ],
  },
  {
    category: "Frontend",
    icon: Monitor,
    color: "from-blue-500 to-cyan-600",
    items: [
      "React 19",
      "Tailwind CSS 3",
      "Vite 7",
      "React Router v7",
      "Lucide Icons",
      "Chart.js / Recharts",
    ],
  },
  {
    category: "Backend",
    icon: Server,
    color: "from-emerald-500 to-green-600",
    items: [
      "Node.js + Express",
      "MongoDB + Mongoose",
      "WebSocket (ws)",
      "JWT Authentication",
      "Nodemailer",
      "Rate Limiting",
    ],
  },
  {
    category: "Communication",
    icon: Wifi,
    color: "from-violet-500 to-purple-600",
    items: [
      "WiFi (IEEE 802.11)",
      "GSM / SMS (AT Commands)",
      "WebSocket Protocol",
      "JSON Telemetry",
      "Two-Way Control",
      "Heartbeat Monitoring",
    ],
  },
];

const SUGGESTION_CATEGORIES = [
  { value: "general", label: "General Feedback" },
  { value: "feature", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
  { value: "improvement", label: "Improvement Idea" },
  { value: "other", label: "Other" },
];

/* ════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════════ */

/* ── Feature Card ── */
function FeatureCard({ icon: Icon, title, desc, color }) {
  const colors = {
    brand:
      "from-brand-500 to-brand-600 shadow-brand-500/25 ring-brand-100 dark:ring-brand-900/40",
    red: "from-red-500 to-red-600 shadow-red-500/25 ring-red-100 dark:ring-red-900/40",
    violet:
      "from-violet-500 to-violet-600 shadow-violet-500/25 ring-violet-100 dark:ring-violet-900/40",
    amber:
      "from-amber-500 to-amber-600 shadow-amber-500/25 ring-amber-100 dark:ring-amber-900/40",
    emerald:
      "from-emerald-500 to-emerald-600 shadow-emerald-500/25 ring-emerald-100 dark:ring-emerald-900/40",
    blue: "from-blue-500 to-blue-600 shadow-blue-500/25 ring-blue-100 dark:ring-blue-900/40",
  };
  const pal = colors[color] || colors.brand;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-surface-200/80 bg-white p-6 shadow-sm ring-1 ring-inset ring-surface-100 transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-surface-800 dark:bg-surface-900 dark:ring-surface-800">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg ${pal}`}
        >
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-surface-800 dark:text-white">
            {title}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed font-medium text-surface-500">
            {desc}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Tech Stack Card ── */
function TechCard({ category, icon: Icon, color, items }) {
  return (
    <div className="group rounded-2xl border border-surface-200/80 bg-white shadow-sm transition-all hover:shadow-md dark:border-surface-800 dark:bg-surface-900">
      <div className="flex items-center gap-3 border-b border-surface-100 px-5 py-4 dark:border-surface-800">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg`}
        >
          <Icon size={18} className="text-white" />
        </div>
        <h3 className="text-sm font-bold text-surface-800 dark:text-white">
          {category}
        </h3>
      </div>
      <ul className="space-y-2 px-5 py-4">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-surface-100 dark:bg-surface-800">
              <CheckCircle2 size={11} className="text-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-surface-600 dark:text-surface-400">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Suggestion Form ── */
function SuggestionForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const formRef = useRef(null);

  const charCount = message.length;
  const maxChars = 2000;
  const canSubmit = name.trim().length >= 2 && message.trim().length >= 5;

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!canSubmit || submitting) return;

      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/api/v1/suggestions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            message: message.trim(),
            category,
          }),
        });

        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to submit");
        }

        setSubmitted(true);
        setName("");
        setMessage("");
        setCategory("general");

        // Reset success state after 5 seconds
        setTimeout(() => setSubmitted(false), 5000);
      } catch (err) {
        setError(err.message);
      } finally {
        setSubmitting(false);
      }
    },
    [name, message, category, canSubmit, submitting]
  );

  return (
    <div className="rounded-2xl border border-surface-200/80 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-surface-100 px-6 py-5 dark:border-surface-800">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg shadow-brand-500/25">
          <MessageSquarePlus size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-surface-800 dark:text-white">
            Share Your Feedback
          </h2>
          <p className="text-[11px] font-semibold text-surface-400">
            Your suggestions help us improve EduGuard
          </p>
        </div>
      </div>

      {/* Success Banner */}
      {submitted && (
        <div className="mx-6 mt-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 dark:border-emerald-800 dark:bg-emerald-900/20">
          <CheckCircle2
            size={18}
            className="shrink-0 text-emerald-600 dark:text-emerald-400"
          />
          <div>
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              Thank you for your feedback!
            </p>
            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              Your suggestion has been recorded successfully
            </p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle
            size={16}
            className="shrink-0 text-red-600 dark:text-red-400"
          />
          <p className="text-xs font-semibold text-red-700 dark:text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* Form */}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5 p-6">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-surface-500">
            Your Name <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <User
              size={14}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={100}
              className="w-full rounded-xl border border-surface-200 bg-surface-50 py-3 pl-10 pr-4 text-sm font-semibold text-surface-800 outline-none transition-all placeholder:text-surface-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:placeholder:text-surface-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-surface-500">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm font-semibold text-surface-800 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
          >
            {SUGGESTION_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-surface-500">
            Your Suggestion <span className="text-red-400">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxChars))}
            placeholder="What would you like to share? Feature ideas, bug reports, improvements, or anything else..."
            rows={5}
            className="w-full resize-none rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 text-sm font-semibold text-surface-800 outline-none transition-all placeholder:text-surface-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:placeholder:text-surface-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-surface-400">
              Minimum 5 characters
            </p>
            <p
              className={`text-[10px] font-bold tabular-nums ${
                charCount > maxChars * 0.9 ? "text-red-500" : "text-surface-400"
              }`}
            >
              {charCount}/{maxChars}
            </p>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:from-brand-600 hover:to-brand-700 hover:shadow-brand-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Send size={16} />
              Submit Feedback
            </>
          )}
        </button>
      </form>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN — AboutPage
   ════════════════════════════════════════════════════════════════ */

export default function AboutPage() {
  return (
    <div className="animate-fade-in space-y-8">
      {/* ═══ Breadcrumb ═══ */}
      <div>
        <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-surface-400">
          <Link
            to="/dashboard"
            className="transition-colors hover:text-brand-500"
          >
            Dashboard
          </Link>
          <ChevronRight size={12} />
          <span className="text-surface-600 dark:text-surface-300">About</span>
        </div>
      </div>

      {/* ═══ Hero Banner ═══ */}
      <div className="relative overflow-hidden rounded-3xl border border-surface-200/60 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 p-8 shadow-xl shadow-brand-500/10 sm:p-10 dark:border-brand-800/50">
        {/* Decorative background elements */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute right-1/4 top-1/3 h-32 w-32 rounded-full bg-white/[0.03]" />

        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 shadow-lg backdrop-blur-sm">
                <Shield size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  EduGuard
                </h1>
                <p className="text-sm font-semibold text-white/70">
                  Smart Classroom Monitoring System
                </p>
              </div>
            </div>
            <p className="max-w-lg text-sm leading-relaxed font-medium text-white/80">
              An IoT-powered classroom management solution that combines ESP32
              hardware with a modern web dashboard for real-time monitoring,
              automated attendance tracking, emergency response, and
              comprehensive reporting — built to make classrooms smarter and
              safer.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                v{PROJECT_VERSION}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                BSc IT Final Year Project
              </span>
              <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-100 backdrop-blur-sm">
                <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Active Development
              </span>
            </div>
          </div>

          {/* Stats cluster */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[
              { n: "10+", label: "Sensors", icon: Cpu },
              { n: "5", label: "Telemetry Channels", icon: Layers },
              { n: "1s", label: "Update Rate", icon: Zap },
              { n: "24/7", label: "Monitoring", icon: Activity },
            ].map(({ n, label, icon: Icon }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm"
              >
                <Icon size={16} className="text-white/60" />
                <span className="text-xl font-black text-white">{n}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Key Features ═══ */}
      <section>
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-surface-800 dark:text-white">
              Key Features
            </h2>
            <p className="text-[11px] font-semibold text-surface-400">
              What makes EduGuard powerful
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ═══ Technology Stack ═══ */}
      <section>
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 shadow-sm">
            <Layers size={15} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-surface-800 dark:text-white">
              Technology Stack
            </h2>
            <p className="text-[11px] font-semibold text-surface-400">
              Built with modern, production-grade technologies
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TECH_STACK.map((t) => (
            <TechCard key={t.category} {...t} />
          ))}
        </div>
      </section>

      {/* ═══ Developer Profile ═══ */}
      <section>
        <div className="mb-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
            <User size={15} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-surface-800 dark:text-white">
              Developer
            </h2>
            <p className="text-[11px] font-semibold text-surface-400">
              The mind behind EduGuard
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-surface-200/80 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8">
            {/* Avatar */}
            <div className="flex shrink-0 flex-col items-center gap-3">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-xl shadow-brand-500/20">
                  <span className="text-3xl font-black text-white">AR</span>
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-emerald-500 dark:border-surface-900">
                  <CheckCircle2 size={12} className="text-white" />
                </div>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-brand-600 ring-1 ring-brand-200/60 dark:bg-brand-900/20 dark:text-brand-400 dark:ring-brand-800/40">
                Lead Developer
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-xl font-black text-surface-900 dark:text-white">
                  Ayush Rai
                </h3>
                <p className="text-sm font-semibold text-surface-500">
                  BSc IT · Final Year
                </p>
              </div>
              <p className="text-sm leading-relaxed font-medium text-surface-600 dark:text-surface-400">
                Passionate about building IoT solutions and full-stack web
                applications. EduGuard is a culmination of embedded systems
                knowledge, real-time networking, and modern web development —
                designed as a final year project to address real classroom
                management challenges.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  "IoT & Embedded Systems",
                  "Full-Stack Development",
                  "React & Node.js",
                  "MongoDB",
                  "ESP32 / Arduino",
                ].map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-surface-100 px-2.5 py-1 text-[10px] font-bold text-surface-600 dark:bg-surface-800 dark:text-surface-400"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Two-column: Suggestion Form + Contact ═══ */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Suggestion form — takes 3 columns */}
        <div className="lg:col-span-3">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
              <MessageSquarePlus size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-surface-800 dark:text-white">
                Suggestions & Feedback
              </h2>
              <p className="text-[11px] font-semibold text-surface-400">
                Help us make EduGuard better
              </p>
            </div>
          </div>
          <SuggestionForm />
        </div>

        {/* Contact & Info — takes 2 columns */}
        <div className="space-y-6 lg:col-span-2">
          {/* Contact Card */}
          <div>
            <div className="mb-5 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow-sm">
                <Mail size={15} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-surface-800 dark:text-white">
                  Get In Touch
                </h2>
                <p className="text-[11px] font-semibold text-surface-400">
                  We'd love to hear from you
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-surface-200/80 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
              <div className="space-y-4 p-6">
                {/* Email */}
                <a
                  href="mailto:eduguard.noreply@gmail.com"
                  className="group flex items-center gap-4 rounded-xl border border-surface-100 bg-surface-50/50 p-4 transition-all hover:border-brand-200 hover:bg-brand-50/30 dark:border-surface-800 dark:bg-surface-800/50 dark:hover:border-brand-800 dark:hover:bg-brand-900/10"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/25">
                    <Mail size={16} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                      Email
                    </p>
                    <p className="truncate text-sm font-bold text-surface-800 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                      eduguard.noreply@gmail.com
                    </p>
                  </div>
                  <ExternalLink
                    size={14}
                    className="shrink-0 text-surface-300 transition-colors group-hover:text-brand-500 dark:text-surface-600"
                  />
                </a>

                {/* Project */}
                <div className="flex items-center gap-4 rounded-xl border border-surface-100 bg-surface-50/50 p-4 dark:border-surface-800 dark:bg-surface-800/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg shadow-brand-500/25">
                    <BookOpen size={16} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                      Project
                    </p>
                    <p className="text-sm font-bold text-surface-800 dark:text-white">
                      Final Year BSc IT
                    </p>
                  </div>
                </div>

                {/* Academic */}
                <div className="flex items-center gap-4 rounded-xl border border-surface-100 bg-surface-50/50 p-4 dark:border-surface-800 dark:bg-surface-800/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 shadow-lg shadow-violet-500/25">
                    <GraduationCap size={16} className="text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                      Academic
                    </p>
                    <p className="text-sm font-bold text-surface-800 dark:text-white">
                      BSc Information Technology
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Info Card */}
          <div className="rounded-2xl border border-surface-200/80 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
            <div className="flex items-center gap-3 border-b border-surface-100 px-5 py-4 dark:border-surface-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 shadow-sm">
                <Star size={14} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-surface-800 dark:text-white">
                Project Highlights
              </h3>
            </div>
            <ul className="space-y-3 px-5 py-4">
              {[
                "ESP32 handles all classroom sensors & actuators",
                "SIM800L for SMS alerts & emergency calls",
                "WebSocket for sub-second dashboard updates",
                "Events persist in MongoDB for analytics",
                "Export reports as Excel, PDF, CSV, JSON",
                "Dark mode & responsive design",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <ArrowRight
                    size={12}
                    className="mt-0.5 shrink-0 text-brand-500"
                  />
                  <span className="text-xs font-semibold leading-relaxed text-surface-600 dark:text-surface-400">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ═══ Footer ═══ */}
      <div className="rounded-2xl border border-surface-200/60 bg-surface-50/50 px-6 py-5 text-center dark:border-surface-800 dark:bg-surface-900/50">
        <p className="flex items-center justify-center gap-1.5 text-xs font-semibold text-surface-400">
          Built with
          <Heart size={12} className="text-red-500" />
          by
          <span className="font-bold text-surface-600 dark:text-surface-300">
            Ayush Rai
          </span>
          ·<span>EduGuard v{PROJECT_VERSION}</span>·
          <span>© {new Date().getFullYear()}</span>
        </p>
      </div>
    </div>
  );
}
