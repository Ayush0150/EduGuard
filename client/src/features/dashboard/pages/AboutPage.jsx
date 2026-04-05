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
  Sparkles,
  Target,
  User,
  Wrench,
  Zap,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import AnimatedPage from "../../../core/components/AnimatedPage";
import { API_BASE_URL } from "../../../core/config/runtime";

const CATEGORIES = [
  { value: "general", label: "Request Support" },
  { value: "improvement", label: "Suggest Improvement" },
  { value: "bug", label: "Report a Bug" },
  { value: "feature", label: "Feature Request" },
  { value: "other", label: "Other" },
];

const GOALS = [
  {
    icon: Shield,
    title: "Safety First",
    text: "Ensure every classroom is continuously monitored for environmental hazards and emergency situations with uncompromising reliability.",
  },
  {
    icon: Zap,
    title: "Instant Awareness",
    text: "Deliver real-time alerts and updates so administrators can act within seconds, maintaining complete situational control.",
  },
  {
    icon: Target,
    title: "Zero Manual Effort",
    text: "Automate routine tasks like attendance logging and safety checks, freeing educators to focus entirely on their students.",
  },
  {
    icon: Lightbulb,
    title: "Actionable Insights",
    text: "Transform raw classroom data into clear, strategic reports that help institutions make smarter operational decisions.",
  },
];

/* ── Contact Our Team Form ── */
function ContactForm() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");
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
        const res = await fetch(`${API_BASE_URL}/api/v1/suggestions`, {
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
        setCategory("general");
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
    "w-full rounded-xl border border-surface-200/80 bg-surface-50/50 px-4 py-3 text-[13px] text-surface-900 outline-none transition-all duration-300 placeholder:text-surface-400 hover:border-brand-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-surface-700/80 dark:bg-surface-900/50 dark:text-surface-100 dark:placeholder:text-surface-500 dark:hover:border-brand-600 dark:focus:border-brand-500 dark:focus:bg-surface-900 dark:focus:ring-brand-500/20";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-surface-200/60 bg-white/80 shadow-xl shadow-surface-200/20 backdrop-blur-xl transition-all dark:border-surface-700/60 dark:bg-surface-800/80 dark:shadow-none">
      {/* Subtle form background glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-400/5 blur-3xl dark:bg-brand-600/5" />

      {/* Header */}
      <div className="relative border-b border-surface-100/80 bg-surface-50/30 px-6 py-5 dark:border-surface-700/50 dark:bg-surface-800/30">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-900 shadow-md dark:bg-surface-100">
            <MessageSquareText size={18} className="text-white dark:text-surface-900" />
          </div>
          <div>
            <h2 className="text-base font-bold text-surface-900 dark:text-white">
              Contact Our Team
            </h2>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Request support, suggest improvements, or report issues.
            </p>
          </div>
        </div>
      </div>

      {submitted && (
        <div className="mx-6 mt-5 flex animate-in fade-in slide-in-from-top-2 items-center gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-900/30">
          <CheckCircle2
            size={18}
            className="shrink-0 text-emerald-600 dark:text-emerald-400"
          />
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
            Your message has been received. We&apos;ll review it shortly.
          </p>
        </div>
      )}

      {error && (
        <div className="mx-6 mt-5 flex animate-in fade-in slide-in-from-top-2 items-center gap-3 rounded-xl border border-red-200/70 bg-red-50/80 px-4 py-3 shadow-sm dark:border-red-800/50 dark:bg-red-900/30">
          <AlertTriangle
            size={18}
            className="shrink-0 text-red-600 dark:text-red-400"
          />
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {error}
          </p>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="relative space-y-5 p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="group">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-surface-500 transition-colors group-focus-within:text-brand-600 dark:text-surface-400 dark:group-focus-within:text-brand-400">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 transition-colors group-focus-within:text-brand-500"
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Smith"
                maxLength={100}
                className={`${inputCls} pl-11`}
              />
            </div>
          </div>
          <div className="group">
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-surface-500 transition-colors group-focus-within:text-brand-600 dark:text-surface-400 dark:group-focus-within:text-brand-400">
              Inquiry Type
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

        <div className="group">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-surface-500 transition-colors group-focus-within:text-brand-600 dark:text-surface-400 dark:group-focus-within:text-brand-400">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
            placeholder="How can we help you today?"
            rows={5}
            className={`${inputCls} resize-none`}
          />
          <div className="mt-2 flex justify-end">
            <span
              className={`text-[11px] font-semibold tabular-nums transition-colors ${
                message.length > MAX * 0.9 ? "text-red-500" : "text-surface-400"
              }`}
            >
              {message.length} / {MAX}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-surface-900 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-surface-900/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none dark:bg-white dark:text-surface-900 dark:hover:shadow-white/10"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Sending securely…
            </>
          ) : (
            <>
              <Send size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
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
      <div className="mx-auto max-w-7xl space-y-10 pb-12">
        {/* ── Premium Hero ── */}
        <div className="group relative overflow-hidden rounded-[2rem] bg-surface-950 shadow-2xl transition-all dark:bg-surface-900">
          {/* Subtle Background Gradients */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
          <div className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-brand-500/20 blur-[120px] transition-all duration-1000 group-hover:bg-brand-500/30" />

          <div className="relative z-10 px-8 py-16 sm:px-12 sm:py-20 lg:px-16 lg:py-24">
            <div className="flex max-w-3xl flex-col items-start gap-6">
              {/* Mission Pill */}
              <div className="inline-flex items-center gap-2 rounded-full border border-surface-700/50 bg-surface-800/50 px-3 py-1.5 backdrop-blur-md">
                <Sparkles size={14} className="text-brand-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-surface-300">
                  Our Mission
                </span>
              </div>

              <div>
                <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Empowering Modern <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-500">Education.</span>
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-surface-300 sm:text-xl">
                  We build intelligent systems that automate attendance, ensure campus safety, and provide educators with the peace of mind they need to focus on what matters most: teaching.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Our Goal ── */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800">
              <Target size={16} className="text-surface-900 dark:text-white" />
            </div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-white">
              Core Principles
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {GOALS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="group relative overflow-hidden rounded-2xl border border-surface-200/60 bg-white/50 p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-surface-300 hover:shadow-xl hover:shadow-surface-200/20 dark:border-surface-700/50 dark:bg-surface-800/40 dark:hover:border-surface-600 dark:hover:shadow-none"
              >
                <div className="relative z-10">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-surface-100 text-surface-900 transition-transform duration-300 group-hover:scale-110 dark:bg-surface-700 dark:text-white">
                    <Icon size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-surface-900 dark:text-white">
                    {title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-surface-500 dark:text-surface-400">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Contact + Form ── */}
        <div className="grid gap-8 lg:grid-cols-5 pt-4">
          {/* Contact card */}
          <div className="lg:col-span-2">
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-surface-200/60 bg-surface-50/50 p-8 transition-all dark:border-surface-700/60 dark:bg-surface-800/30">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-200 dark:bg-surface-700">
                <Wrench size={20} className="text-surface-900 dark:text-white" />
              </div>

              <h2 className="text-xl font-bold text-surface-900 dark:text-white">
                Get in Touch
              </h2>
              <p className="mt-3 text-[14px] leading-relaxed text-surface-600 dark:text-surface-300">
                Need technical assistance, have a billing question, or want to discuss a custom implementation? Reach out directly and our dedicated support team will respond promptly.
              </p>

              <div className="mt-auto pt-8">
                <a
                  href="mailto:hello@eduguard.com"
                  className="group/mail flex items-center gap-4 rounded-xl border border-surface-200 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-surface-700 dark:bg-surface-800 dark:hover:border-brand-700"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-100 transition-colors group-hover/mail:bg-brand-50 dark:bg-surface-700 dark:group-hover/mail:bg-brand-900/30">
                    <Mail
                      size={18}
                      className="text-surface-600 transition-colors group-hover/mail:text-brand-600 dark:text-surface-400 dark:group-hover/mail:text-brand-400"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400 dark:text-surface-500">
                      Direct Email
                    </p>
                    <p className="truncate text-sm font-semibold text-surface-900 transition-colors group-hover/mail:text-brand-600 dark:text-surface-100 dark:group-hover/mail:text-brand-400">
                      hello@eduguard.com
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-surface-300 transition-all duration-300 group-hover/mail:translate-x-1 group-hover/mail:text-brand-600 dark:text-surface-600 dark:group-hover/mail:text-brand-400"
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
      </div>
    </AnimatedPage>
  );
}
