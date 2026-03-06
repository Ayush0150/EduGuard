import {
  Activity,
  AlertTriangle,
  ArrowUp,
  BarChart3,
  Bell,
  Clock,
  Minus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import http from "../../../core/http";

/* ── Helpers ── */

function timestamp() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Hey there";
}

function makeWelcome() {
  return {
    id: "welcome",
    role: "bot",
    text: `${getGreeting()}! I'm **EduGuard AI**.\n\nHere's what I can do:\n• Alerts & emergencies\n• Teacher attendance\n• System stats & reports\n• Classroom monitoring\n\nJust ask naturally or tap a quick action!`,
    time: timestamp(),
  };
}

/* ── Markdown-lite renderer ── */
function FormattedText({ text }) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        if (line.trim() === "") return <div key={i} className="h-2" />;

        // Process inline bold **text**
        const renderInline = (str) => {
          const parts = [];
          let rest = str;
          let k = 0;
          while (rest.length > 0) {
            const bs = rest.indexOf("**");
            if (bs === -1) {
              parts.push(<span key={k++}>{rest}</span>);
              break;
            }
            const be = rest.indexOf("**", bs + 2);
            if (be === -1) {
              parts.push(<span key={k++}>{rest}</span>);
              break;
            }
            if (bs > 0) parts.push(<span key={k++}>{rest.slice(0, bs)}</span>);
            parts.push(
              <span key={k++} className="font-semibold">
                {rest.slice(bs + 2, be)}
              </span>
            );
            rest = rest.slice(be + 2);
          }
          return parts;
        };

        const trimmed = line.trimStart();

        // Bullet lines (•, ·, -)
        const isBullet =
          trimmed.startsWith("•") ||
          trimmed.startsWith("·") ||
          (trimmed.startsWith("- ") && !trimmed.startsWith("--"));
        if (isBullet) {
          const content = trimmed.replace(/^[•·-]\s*/, "");
          return (
            <div key={i} className="flex gap-2 pl-1 py-[1px]">
              <span className="mt-[1px] text-brand-400 dark:text-brand-500 select-none">
                •
              </span>
              <span>{renderInline(content)}</span>
            </div>
          );
        }

        // Data rows: "  Label  —  value" or "  time  Label  detail"
        const dataMatch = trimmed.match(/^(.+?)\s+—\s+(.+)$/);
        if (dataMatch) {
          return (
            <div
              key={i}
              className="flex items-center justify-between gap-3 py-[1px] pl-1 pr-1"
            >
              <span className="text-surface-500 dark:text-surface-400">
                {renderInline(dataMatch[1].trim())}
              </span>
              <span className="font-semibold tabular-nums">
                {renderInline(dataMatch[2].trim())}
              </span>
            </div>
          );
        }

        // Event log rows: "  10:30 AM · P3  Washroom · detail"
        // Detect by leading time pattern
        const timeLogMatch = trimmed.match(
          /^(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\s*(.*)/
        );
        if (timeLogMatch) {
          return (
            <div key={i} className="flex gap-2.5 py-[1px] pl-1 text-[12.5px]">
              <span className="shrink-0 font-medium tabular-nums text-brand-500 dark:text-brand-400">
                {timeLogMatch[1]}
              </span>
              <span className="text-surface-600 dark:text-surface-300">
                {renderInline(timeLogMatch[2])}
              </span>
            </div>
          );
        }

        // Section headers: lines starting with emoji + text (no leading spaces)
        const isHeader =
          /^[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/u.test(trimmed) &&
          !line.startsWith("  ");
        if (isHeader) {
          return (
            <div key={i} className="font-semibold pt-0.5 pb-[1px]">
              {renderInline(line)}
            </div>
          );
        }

        // Default line
        return (
          <div key={i} className="py-[1px]">
            {renderInline(line)}
          </div>
        );
      })}
    </div>
  );
}

/* ── Typing Indicator ── */
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 animate-fade-in pl-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/25">
        <Sparkles size={14} />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-surface-200/60 bg-white px-5 py-3.5 shadow-sm dark:border-surface-700/60 dark:bg-surface-800/90">
        <span className="h-[5px] w-[5px] animate-bounce rounded-full bg-brand-500 [animation-delay:-0.3s]" />
        <span className="h-[5px] w-[5px] animate-bounce rounded-full bg-brand-400 [animation-delay:-0.15s]" />
        <span className="h-[5px] w-[5px] animate-bounce rounded-full bg-brand-300" />
      </div>
    </div>
  );
}

/* ── Chat Bubble ── */
function ChatBubble({ msg }) {
  const isBot = msg.role === "bot";

  return (
    <div
      className={`flex items-end gap-2.5 animate-fade-in ${
        isBot ? "pl-1" : "flex-row-reverse pr-1"
      }`}
    >
      {isBot && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/25">
          <Sparkles size={14} />
        </div>
      )}

      <div
        className={`flex max-w-[82%] flex-col gap-1 ${isBot ? "items-start" : "items-end"}`}
      >
        <div
          className={`w-full px-4 py-3 text-[13px] leading-[1.75] ${
            isBot
              ? "rounded-2xl rounded-bl-md border border-surface-200/50 bg-white text-surface-700 shadow-sm dark:border-surface-700/50 dark:bg-surface-800/90 dark:text-surface-200"
              : "rounded-2xl rounded-br-md bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-md shadow-brand-500/25"
          }`}
        >
          <FormattedText text={msg.text} />
        </div>
        <span
          className={`px-1 text-[10px] font-medium tracking-wide text-surface-400 dark:text-surface-500 ${
            isBot ? "ml-0.5" : "mr-0.5"
          }`}
        >
          {msg.time}
        </span>
      </div>
    </div>
  );
}

/* ── Quick Action Chips ── */
const QUICK_ACTIONS = [
  { label: "Summary", value: "summary", icon: BarChart3 },
  { label: "Emergency", value: "emergency", icon: Bell },
  { label: "Teacher", value: "teacher", icon: User },
  { label: "Washroom", value: "washroom", icon: Activity },
  { label: "Alerts", value: "alerts", icon: AlertTriangle },
  { label: "Status", value: "status", icon: Clock },
  { label: "Recent", value: "recent", icon: Search },
  { label: "Safe?", value: "safe", icon: ShieldCheck },
];

function QuickActions({ onSelect, disabled }) {
  return (
    <div className="relative w-full border-t border-surface-200/40 bg-white/60 dark:border-surface-700/40 dark:bg-surface-800/60">
      <div className="flex w-full items-center gap-2 overflow-x-auto px-4 py-2.5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {QUICK_ACTIONS.map((chip) => {
          const Icon = chip.icon;
          return (
            <button
              key={chip.value}
              onClick={() => onSelect(chip.value)}
              disabled={disabled}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-surface-200/60 bg-surface-50 px-3 py-1.5 text-[11.5px] font-semibold tracking-wide text-surface-500 transition-all hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 active:scale-95 disabled:opacity-40 dark:border-surface-700/60 dark:bg-surface-800/60 dark:text-surface-400 dark:hover:border-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-300"
            >
              <Icon size={12} />
              {chip.label}
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-6 bg-gradient-to-l from-white to-transparent dark:from-surface-800" />
    </div>
  );
}

/* ── Main Component ── */

export default function EduGuardAssistant() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const welcomeMsg = useMemo(() => makeWelcome(), []);
  const [messages, setMessages] = useState([welcomeMsg]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const clearChat = useCallback(() => {
    setMessages([makeWelcome()]);
  }, []);

  /* Auto-scroll on new messages */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  /* Focus input when chat opens */
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimized]);

  const sendMessage = useCallback(
    async (text) => {
      const msg = (text || input).trim();
      if (!msg || loading) return;

      const userMsg = {
        id: Date.now(),
        role: "user",
        text: msg,
        time: timestamp(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const { data } = await http.post("/api/v1/chatbot", {
          message: msg,
          clientHour: new Date().getHours(),
        });
        const reply = data?.data?.reply || "Sorry, I could not process that.";

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "bot",
            text: reply,
            time: timestamp(),
          },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "bot",
            text: "Sorry, something went wrong. Please try again.",
            time: timestamp(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ── Floating Button ── */
  if (!open) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        <div className="animate-fade-in-right rounded-xl bg-white px-4 py-2.5 shadow-lg shadow-surface-900/8 dark:bg-surface-800 dark:shadow-black/20">
          <p className="text-[13px] font-bold tracking-wide text-surface-800 dark:text-surface-100">
            EduGuard AI
          </p>
          <p className="text-[10px] font-medium text-brand-500 dark:text-brand-400">
            Ask me anything
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="group flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/30 ring-2 ring-white/20 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-brand-500/40 active:scale-95 dark:ring-surface-800/40"
          aria-label="Open EduGuard AI"
        >
          <Sparkles
            size={22}
            className="transition-transform duration-300 group-hover:rotate-12"
          />
        </button>
      </div>
    );
  }

  /* ── Minimized State ── */
  if (minimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 animate-slide-up">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-3 text-[13px] font-semibold tracking-wide text-white shadow-lg shadow-brand-500/25 transition-all hover:scale-105 hover:shadow-xl active:scale-95"
        >
          <Sparkles size={16} />
          EduGuard AI
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setMinimized(false);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-surface-400 shadow-lg transition-all hover:bg-surface-50 hover:text-surface-600 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  /* ── Chat Window ── */
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex w-[340px] flex-col overflow-hidden rounded-[1.25rem] border border-surface-200/50 bg-white shadow-2xl shadow-surface-900/10 transition-all duration-300 animate-slide-up dark:border-surface-700/50 dark:bg-surface-900 dark:shadow-black/30 sm:w-[380px]"
      style={{ height: "min(580px, calc(100vh - 48px))" }}
    >
      {/* ── Header ── */}
      <div className="relative flex items-center justify-between border-b border-surface-100/80 bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-3.5 dark:border-surface-700/40">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-sm">
            <Sparkles size={17} />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-brand-500 bg-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
          </div>
          <div>
            <h3 className="text-[14px] font-bold tracking-wide text-white">
              EduGuard AI
            </h3>
            <p className="text-[10.5px] font-medium tracking-wider text-white/70">
              Online · Ready to help
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={clearChat}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <Trash2 size={15} />
          </button>
          <button
            onClick={() => setMinimized(true)}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Minimize"
          >
            <Minus size={17} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* ── Messages Area ── */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto bg-surface-50 p-4 pb-5 dark:bg-surface-900 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-surface-200 dark:[&::-webkit-scrollbar-thumb]:bg-surface-700"
        style={{ scrollBehavior: "smooth" }}
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}
        {loading && <TypingIndicator />}
      </div>

      {/* ── Interactive Footer Area ── */}
      <div className="border-t border-surface-100/60 bg-white dark:border-surface-700/40 dark:bg-surface-800">
        <QuickActions onSelect={sendMessage} disabled={loading} />

        {/* Input */}
        <div className="px-3.5 pb-3.5 pt-2">
          <div className="flex items-end gap-2 rounded-xl border border-surface-200/60 bg-surface-50 p-1 transition-all focus-within:border-brand-400 focus-within:bg-white focus-within:shadow-sm focus-within:shadow-brand-500/10 dark:border-surface-700/60 dark:bg-surface-900/50 dark:focus-within:bg-surface-900">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={loading}
              rows={1}
              maxLength={500}
              className="max-h-[100px] min-h-[40px] w-full resize-none bg-transparent px-3 py-2.5 text-[13.5px] text-surface-800 outline-none placeholder:text-surface-400 disabled:opacity-50 dark:text-surface-200 dark:placeholder:text-surface-500 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="mb-0.5 mr-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-sm shadow-brand-500/20 transition-all hover:shadow-md active:scale-90 disabled:opacity-30 disabled:shadow-none"
              aria-label="Send message"
            >
              <ArrowUp size={17} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
