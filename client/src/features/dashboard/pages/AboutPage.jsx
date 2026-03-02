import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Mail,
  MessageSquareText,
  Send,
  Shield,
  Target,
  User,
  Wrench,
  Zap,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import AnimatedPage from "../../../core/components/AnimatedPage";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  `http://${window.location.hostname}:8080`;

const CATEGORIES = [
  { value: "support", label: "Request Support" },
  { value: "improvement", label: "Suggest Improvement" },
  { value: "bug", label: "Report a Bug" },
  { value: "feature", label: "Feature Request" },
  { value: "other", label: "Other" },
];

const GOALS = [
  {
    icon: Shield,
    title: "Safety First",
    text: "Ensure every classroom is continuously monitored for environmental hazards and emergency situations.",
  },
  {
    icon: Zap,
    title: "Instant Awareness",
    text: "Deliver real-time alerts and attendance updates so administrators can act within seconds, not minutes.",
  },
  {
    icon: Target,
    title: "Zero Manual Effort",
    text: "Automate routine tasks like attendance logging and safety checks — freeing staff to focus on teaching.",
  },
  {
    icon: Lightbulb,
    title: "Actionable Insights",
    text: "Turn raw classroom data into clear reports that help institutions make smarter operational decisions.",
  },
];

/* ── Contact Our Team Form ── */
function ContactForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("support");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const formRef = useRef(null);

  const MAX = 2000;
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
        if (!res.ok || !json.success)
          throw new Error(json.message || "Failed to submit");
        setSubmitted(true);
        setName("");
        setMessage("");
        setCategory("support");
        setTimeout(() => setSubmitted(false), 5000);
      } catch (err) {
        setError(err.message);
      } finally {
        setSubmitting(false);
      }
    },
    [name, message, category, canSubmit, submitting]
  );

  const inputCls =
    "w-full rounded-xl border border-surface-200 bg-surface-50/50 px-3.5 py-2.5 text-sm text-surface-900 outline-none transition-all placeholder:text-surface-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800/60 dark:text-surface-100 dark:placeholder:text-surface-500 dark:focus:border-brand-500 dark:focus:bg-surface-800 dark:focus:ring-brand-900/30";

  return (
    <div className="overflow-hidden rounded-2xl border border-surface-200/80 bg-white dark:border-surface-800 dark:bg-surface-900">
      {/* Header */}
      <div className="border-b border-surface-100 bg-surface-50/50 px-6 py-5 dark:border-surface-800 dark:bg-surface-800/30">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-sm shadow-brand-600/20">
            <MessageSquareText size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-surface-900 dark:text-white">
              Contact Our Team
            </h2>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Request support, suggest improvements, or report issues.
            </p>
          </div>
        </div>
      </div>

      {submitted && (
        <div className="mx-6 mt-5 flex items-center gap-2.5 rounded-xl border border-emerald-200/70 bg-emerald-50 px-4 py-3 dark:border-emerald-800/50 dark:bg-emerald-950/30">
          <CheckCircle2
            size={15}
            className="shrink-0 text-emerald-600 dark:text-emerald-400"
          />
          <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
            Your message has been received. We&apos;ll review it shortly.
          </p>
        </div>
      )}

      {error && (
        <div className="mx-6 mt-5 flex items-center gap-2.5 rounded-xl border border-red-200/70 bg-red-50 px-4 py-3 dark:border-red-800/50 dark:bg-red-950/30">
          <AlertTriangle
            size={14}
            className="shrink-0 text-red-600 dark:text-red-400"
          />
          <p className="text-xs font-medium text-red-700 dark:text-red-400">
            {error}
          </p>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-400">
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
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-400">
              Reason
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-400">
            Message <span className="text-red-400">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
            placeholder="Describe your request, suggestion, or issue in detail…"
            rows={5}
            className={`${inputCls} resize-none`}
          />
          <div className="mt-1 flex justify-end">
            <span
              className={`text-[10px] font-medium tabular-nums ${
                message.length > MAX * 0.9 ? "text-red-500" : "text-surface-400"
              }`}
            >
              {message.length}/{MAX}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition-all hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send size={14} />
              Send Message
            </>
          )}
        </button>
      </form>
    </div>
  );
}

/* ── Main ── */
export default function AboutPage() {
  return (
    <AnimatedPage>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-surface-200/80 bg-white dark:border-surface-800 dark:bg-surface-900">
        {/* Decorative gradients */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-brand-500/[0.05] blur-3xl dark:bg-brand-400/[0.07]" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-violet-500/[0.04] blur-3xl dark:bg-violet-400/[0.05]" />

        <div className="relative p-5 sm:p-6 lg:p-8">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0 flex-1">
              {/* Status pill */}
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50/80 px-2.5 py-1 dark:border-emerald-800/40 dark:bg-emerald-950/30">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[10px] font-semibold tracking-wide text-emerald-700 dark:text-emerald-400">
                  All Systems Operational
                </span>
              </div>

              <h1 className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-white sm:text-3xl">
                EduGuard
                <span className="ml-2 align-middle text-xs font-semibold text-surface-300 dark:text-surface-600">
                  v1.0.0
                </span>
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-surface-500 dark:text-surface-400">
                Smart classroom management &mdash; automated attendance, instant
                safety alerts, and real-time monitoring from one dashboard.
              </p>

              {/* Inline metrics */}
              <div className="mt-4 flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-surface-200 bg-surface-50/80 px-3 py-1.5 dark:border-surface-700 dark:bg-surface-800/60">
                  <Zap size={12} className="text-amber-500" />
                  <span className="text-xs font-bold text-surface-700 dark:text-surface-200">
                    1s
                  </span>
                  <span className="text-[10px] text-surface-400">updates</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-surface-200 bg-surface-50/80 px-3 py-1.5 dark:border-surface-700 dark:bg-surface-800/60">
                  <Shield size={12} className="text-brand-500" />
                  <span className="text-xs font-bold text-surface-700 dark:text-surface-200">
                    24/7
                  </span>
                  <span className="text-[10px] text-surface-400">
                    monitoring
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Our Goal ── */}
      <div className="mt-4">
        <div className="mb-3 flex items-center gap-2 px-0.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600">
            <Target size={12} className="text-white" />
          </div>
          <h2 className="text-sm font-bold text-surface-900 dark:text-white">
            Our Goal
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {GOALS.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="group rounded-xl border border-surface-200/80 bg-white p-4 transition-all hover:border-surface-300/80 hover:shadow-sm dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700"
            >
              <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 transition-colors group-hover:bg-brand-100 dark:bg-brand-950/40 dark:group-hover:bg-brand-950/60">
                <Icon
                  size={15}
                  className="text-brand-600 dark:text-brand-400"
                />
              </div>
              <p className="text-[13px] font-bold text-surface-900 dark:text-white">
                {title}
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-surface-500 dark:text-surface-400">
                {text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Contact + Form ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* Contact card */}
        <div className="lg:col-span-2">
          <div className="h-full overflow-hidden rounded-xl border border-surface-200/80 bg-white dark:border-surface-800 dark:bg-surface-900">
            <div className="border-b border-surface-100 bg-surface-50/50 px-5 py-4 dark:border-surface-800 dark:bg-surface-800/30">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
                  <Wrench size={14} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-surface-900 dark:text-white">
                    Get in Touch
                  </h2>
                  <p className="text-[11px] text-surface-500 dark:text-surface-400">
                    We&apos;re here to help.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <p className="text-[12.5px] leading-relaxed text-surface-500 dark:text-surface-400">
                Need assistance, have a question, or want to share an idea?
                Reach out directly and we&apos;ll respond as soon as possible.
              </p>

              <a
                href="mailto:eduguard.noreply@gmail.com"
                className="group/mail mt-4 flex items-center gap-3 rounded-lg border border-surface-200 bg-surface-50/80 px-3.5 py-3 transition-all hover:border-brand-200 hover:bg-brand-50/50 dark:border-surface-700 dark:bg-surface-800/50 dark:hover:border-brand-800 dark:hover:bg-brand-950/20"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-100 transition-colors group-hover/mail:bg-brand-200 dark:bg-brand-900/40 dark:group-hover/mail:bg-brand-900/60">
                  <Mail
                    size={14}
                    className="text-brand-600 dark:text-brand-400"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-400">
                    Email
                  </p>
                  <p className="truncate text-[13px] font-medium text-surface-700 dark:text-surface-200">
                    eduguard.noreply@gmail.com
                  </p>
                </div>
                <ArrowRight
                  size={13}
                  className="shrink-0 text-surface-300 transition-transform group-hover/mail:translate-x-0.5 group-hover/mail:text-brand-500 dark:text-surface-600"
                />
              </a>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          <ContactForm />
        </div>
      </div>
    </AnimatedPage>
  );
}
