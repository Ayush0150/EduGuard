/**
 * SubjectTrackerPage
 * ──────────────────
 * Premium lecture progress tracker — teachers add subjects as tabs,
 * then log date / topic / pages covered for each lecture session.
 * All data persists in localStorage.
 */

import {
  BookOpen,
  Calendar,
  CheckCircle2,
  FileText,
  Hash,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AnimatedPage from "../../../core/components/AnimatedPage";

/* ── Constants ── */
const STORAGE_KEY = "eduguard_subjects";
const MAX_SUBJECTS = 20;
const MAX_ENTRIES = 200;

/* ── Persistence helpers ── */
function loadSubjects() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSubjects(subjects) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subjects));
  } catch {
    /* quota */
  }
}

/* ── ID generator ── */
let _counter = Date.now();
function uid() {
  return `s${++_counter}`;
}

/* ── Date helpers ── */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeDate(iso) {
  if (!iso) return "";
  const diff = Math.floor(
    (Date.now() - new Date(iso + "T00:00:00").getTime()) / 86400000
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  return "";
}

/* ═══════════════════════════════════════════════════════════════
   ADD SUBJECT MODAL
   ═══════════════════════════════════════════════════════════════ */
function AddSubjectModal({ open, onClose, onAdd }) {
  const [name, setName] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      queueMicrotask(() => setName(""));
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-900/40 backdrop-blur-md transition-opacity duration-300 dark:bg-black/60"
        onClick={onClose}
      />
      {/* Panel */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200 ease-out rounded-2xl border border-surface-200/60 bg-white p-7 shadow-[0_16px_40px_rgb(0,0,0,0.12)] dark:border-surface-700/60 dark:bg-surface-900 dark:shadow-[0_16px_40px_rgb(0,0,0,0.5)]"
      >
        <div className="mb-6 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-inner shadow-white/20 ring-1 ring-brand-500/20">
            <BookOpen size={24} className="text-white drop-shadow-sm" />
          </div>
          <div className="pt-1">
            <h3 className="text-lg font-bold tracking-tight text-surface-900 dark:text-white">
              Create New Subject
            </h3>
            <p className="mt-1 text-[13px] text-surface-500 dark:text-surface-400">
              Add a new tab to organize and track your lecture progress.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[12px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
            Subject Name <span className="text-red-500">*</span>
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Advanced Mathematics, Modern Physics..."
            maxLength={50}
            className="w-full rounded-xl border border-surface-200 bg-surface-50/50 px-4 py-3 text-[14px] font-medium text-surface-900 outline-none transition-all placeholder:text-surface-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-surface-700 dark:bg-surface-800/50 dark:text-white dark:placeholder:text-surface-500 dark:focus:border-brand-500 dark:focus:bg-surface-800"
          />
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-[14px] font-semibold text-surface-600 transition-all hover:bg-surface-100 active:scale-[0.98] dark:text-surface-300 dark:hover:bg-surface-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-5 py-2.5 text-[14px] font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:from-brand-500 hover:to-brand-400 hover:shadow-lg hover:shadow-brand-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-md"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Subject
          </button>
        </div>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ADD LECTURE ENTRY FORM (inline)
   ═══════════════════════════════════════════════════════════════ */
function AddEntryForm({ onAdd, onCancel }) {
  const [date, setDate] = useState(todayISO());
  const [topic, setTopic] = useState("");
  const [pages, setPages] = useState("");
  const topicRef = useRef(null);

  useEffect(() => {
    setTimeout(() => topicRef.current?.focus(), 50);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    onAdd({ date, topic: topic.trim(), pages: pages.trim() });
    setTopic("");
    setPages("");
    setDate(todayISO());
    setTimeout(() => topicRef.current?.focus(), 30);
  };

  const inputCls =
    "w-full rounded-lg border border-surface-200 bg-white px-3.5 py-2.5 text-[13px] font-medium text-surface-900 outline-none transition-all placeholder:text-surface-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:placeholder:text-surface-500 dark:focus:border-brand-500";

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-in fade-in slide-in-from-top-2 duration-300 relative overflow-hidden rounded-2xl border border-brand-200/80 bg-gradient-to-b from-brand-50/50 to-white p-5 shadow-sm dark:border-brand-800/40 dark:from-brand-950/20 dark:to-surface-900"
    >
      <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-brand-400 to-brand-600" />

      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/40">
          <Pencil size={14} className="text-brand-600 dark:text-brand-400" />
        </div>
        <span className="text-[14px] font-bold text-surface-900 dark:text-white">
          Log New Lecture
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-12">
        <div className="sm:col-span-3">
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-surface-500">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-6">
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-surface-500">
            Topic Covered <span className="text-red-500">*</span>
          </label>
          <input
            ref={topicRef}
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What was taught today?"
            maxLength={120}
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-3">
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-surface-500">
            Portion / Pages
          </label>
          <input
            type="text"
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder="e.g. Ch.3 pg 45-52"
            maxLength={80}
            className={inputCls}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-[13px] font-semibold text-surface-600 transition-colors hover:bg-surface-100 active:scale-[0.98] dark:text-surface-400 dark:hover:bg-surface-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!topic.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-surface-900 px-4 py-2 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-surface-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-surface-900 dark:hover:bg-surface-100"
        >
          <CheckCircle2 size={14} />
          Save Entry
        </button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════
   LECTURE ENTRY ROW
   ═══════════════════════════════════════════════════════════════ */
function EntryRow({ entry, index, onDelete }) {
  const rel = relativeDate(entry.date);

  return (
    <div className="group relative flex items-start gap-4 rounded-xl border border-transparent bg-white p-4 transition-all duration-200 hover:border-surface-200 hover:shadow-md dark:bg-surface-900 dark:hover:border-surface-700 dark:hover:shadow-black/20">
      {/* Colorful Row Number Indicator */}
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-surface-50 to-surface-100 font-mono text-[13px] font-bold text-surface-500 shadow-inner ring-1 ring-inset ring-surface-200/60 dark:from-surface-800 dark:to-surface-800 dark:text-surface-400 dark:ring-surface-700">
        {index + 1}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[15px] font-bold leading-snug text-surface-900 dark:text-white">
          {entry.topic}
        </p>

        {/* Colorful Badges */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-blue-200/60 bg-blue-50/50 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:border-blue-800/40 dark:bg-blue-900/20 dark:text-blue-400">
            <Calendar size={12} className="text-blue-500 dark:text-blue-400" />
            {formatDate(entry.date)}
            {rel && (
              <span className="ml-1 rounded bg-blue-100/80 px-1 py-0.5 text-[10px] text-blue-800 dark:bg-blue-800/40 dark:text-blue-300">
                {rel}
              </span>
            )}
          </div>

          {entry.pages && (
            <div className="flex items-center gap-1.5 rounded-md border border-amber-200/60 bg-amber-50/50 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
              <FileText
                size={12}
                className="text-amber-500 dark:text-amber-400"
              />
              {entry.pages}
            </div>
          )}
        </div>
      </div>

      {/* Delete Action */}
      <button
        onClick={() => onDelete(entry.id)}
        className="shrink-0 rounded-lg p-2 text-surface-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 active:scale-95 dark:text-surface-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        title="Delete entry"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EMPTY STATES
   ═══════════════════════════════════════════════════════════════ */
function EmptySubjects({ onAdd }) {
  return (
    <div className="relative mt-6 flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-surface-200/60 bg-gradient-to-b from-white to-surface-50/50 py-24 shadow-sm dark:border-surface-800/60 dark:from-surface-900 dark:to-surface-900/50">
      {/* Decorative background blur */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-400/10 blur-3xl" />
      <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />

      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-100 to-blue-50 shadow-inner ring-1 ring-inset ring-white dark:from-brand-900/40 dark:to-blue-900/20 dark:ring-white/5">
        <Layers
          size={32}
          className="text-brand-600 dark:text-brand-400"
          strokeWidth={1.5}
        />
      </div>
      <h3 className="relative text-xl font-extrabold tracking-tight text-surface-900 dark:text-white">
        No subjects tracked yet
      </h3>
      <p className="relative mt-2 max-w-sm text-center text-[14px] text-surface-500 dark:text-surface-400">
        Create your first subject tab to beautifully organize your lectures,
        track topics, and monitor syllabus progression.
      </p>
      <button
        onClick={onAdd}
        className="relative mt-8 flex items-center gap-2 rounded-xl bg-surface-900 px-6 py-3 text-[14px] font-semibold text-white shadow-md transition-all hover:bg-surface-800 hover:shadow-lg hover:shadow-surface-900/20 active:scale-[0.98] dark:bg-white dark:text-surface-900 dark:hover:bg-surface-100"
      >
        <Plus size={18} strokeWidth={2.5} />
        Create First Subject
      </button>
    </div>
  );
}

function EmptyEntries({ subjectName, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-200 bg-surface-50/50 py-16 text-center dark:border-surface-700/60 dark:bg-surface-800/20">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-inset ring-surface-200 dark:bg-surface-800 dark:ring-surface-700">
        <BookOpen
          size={24}
          className="text-surface-400 dark:text-surface-500"
          strokeWidth={1.5}
        />
      </div>
      <p className="text-[15px] font-bold text-surface-800 dark:text-white">
        No lectures logged for {subjectName}
      </p>
      <p className="mt-1.5 max-w-sm text-[13px] text-surface-500 dark:text-surface-400">
        Keep track of your classes by adding your first lecture entry with the
        date, topic, and pages covered.
      </p>
      <button
        onClick={onAdd}
        className="mt-6 flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-bold text-surface-700 shadow-sm ring-1 ring-inset ring-surface-200 transition-all hover:bg-surface-50 hover:text-surface-900 active:scale-[0.98] dark:bg-surface-800 dark:text-surface-300 dark:ring-surface-700 dark:hover:bg-surface-700 dark:hover:text-white"
      >
        <Plus size={16} strokeWidth={2.5} />
        Log First Lecture
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN — SubjectTrackerPage
   ═══════════════════════════════════════════════════════════════ */
export default function SubjectTrackerPage() {
  const [subjects, setSubjects] = useState(loadSubjects);
  const [selectedId, setSelectedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const editRef = useRef(null);

  /* Persist to localStorage */
  useEffect(() => {
    saveSubjects(subjects);
  }, [subjects]);

  /* Derived active ID */
  const activeId = useMemo(() => {
    if (subjects.length === 0) return null;
    if (selectedId && subjects.find((s) => s.id === selectedId))
      return selectedId;
    return subjects[0].id;
  }, [subjects, selectedId]);

  const activeSubject = useMemo(
    () => subjects.find((s) => s.id === activeId) || null,
    [subjects, activeId]
  );

  const filteredEntries = useMemo(() => {
    if (!activeSubject) return [];
    if (!search.trim()) return activeSubject.entries;
    const q = search.toLowerCase();
    return activeSubject.entries.filter(
      (e) =>
        e.topic.toLowerCase().includes(q) ||
        (e.pages && e.pages.toLowerCase().includes(q)) ||
        e.date.includes(q)
    );
  }, [activeSubject, search]);

  /* ── CRUD Methods ── */
  const addSubject = useCallback((name) => {
    const newSub = { id: uid(), name, entries: [], createdAt: Date.now() };
    setSubjects((prev) => {
      if (prev.length >= MAX_SUBJECTS) return prev;
      return [...prev, newSub];
    });
    setSelectedId(newSub.id);
  }, []);

  const deleteSubject = useCallback(
    (id) => {
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      if (activeId === id) setSelectedId(null);
    },
    [activeId]
  );

  const startEdit = useCallback((sub) => {
    setEditingId(sub.id);
    setEditName(sub.name);
    setTimeout(() => editRef.current?.focus(), 30);
  }, []);

  const commitEdit = useCallback(() => {
    const trimmed = editName.trim();
    if (trimmed && editingId) {
      setSubjects((prev) =>
        prev.map((s) => (s.id === editingId ? { ...s, name: trimmed } : s))
      );
    }
    setEditingId(null);
    setEditName("");
  }, [editingId, editName]);

  const addEntry = useCallback(
    (entryData) => {
      if (!activeId) return;
      setSubjects((prev) =>
        prev.map((s) => {
          if (s.id !== activeId) return s;
          const entries = [{ id: uid(), ...entryData }, ...s.entries].slice(
            0,
            MAX_ENTRIES
          );
          return { ...s, entries };
        })
      );
    },
    [activeId]
  );

  const deleteEntry = useCallback(
    (entryId) => {
      if (!activeId) return;
      setSubjects((prev) =>
        prev.map((s) => {
          if (s.id !== activeId) return s;
          return { ...s, entries: s.entries.filter((e) => e.id !== entryId) };
        })
      );
    },
    [activeId]
  );

  /* ── Stats ── */
  const stats = useMemo(() => {
    if (!activeSubject) return null;
    const entries = activeSubject.entries;
    const total = entries.length;
    const latest = entries.length > 0 ? entries[0].date : null;
    return { total, latest };
  }, [activeSubject]);

  return (
    <AnimatedPage>
      {/* ── Page Header ── */}
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 shadow-lg shadow-brand-500/20 ring-1 ring-inset ring-white/20">
            <BookOpen size={24} className="text-white drop-shadow-sm" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-surface-900 dark:text-white">
              Syllabus Tracker
            </h1>
            <p className="mt-1 text-[14px] font-medium text-surface-500 dark:text-surface-400">
              Manage your subjects, log lectures, and monitor progress.
            </p>
          </div>
        </div>

        {subjects.length > 0 && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 self-start rounded-xl bg-surface-900 px-5 py-2.5 text-[14px] font-semibold text-white shadow-md transition-all hover:bg-surface-800 hover:shadow-lg hover:shadow-surface-900/20 active:scale-[0.98] sm:self-auto dark:bg-white dark:text-surface-900 dark:hover:bg-surface-100"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add Subject
          </button>
        )}
      </div>

      {subjects.length === 0 ? (
        <EmptySubjects onAdd={() => setShowAddModal(true)} />
      ) : (
        <div className="flex flex-col gap-6">
          {/* ── Sleek Modern Tabs ── */}
          <div className="relative">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {subjects.map((sub) => {
                const isActive = sub.id === activeId;
                const isEditing = sub.id === editingId;

                return (
                  <div
                    key={sub.id}
                    className={`group relative flex shrink-0 items-center rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-white shadow-sm ring-1 ring-inset ring-surface-200 dark:bg-surface-800 dark:ring-surface-700"
                        : "bg-transparent hover:bg-surface-100 dark:hover:bg-surface-800/60"
                    }`}
                  >
                    {isEditing ? (
                      <input
                        ref={editRef}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") {
                            setEditingId(null);
                            setEditName("");
                          }
                        }}
                        maxLength={50}
                        className="mx-1 my-1 w-32 rounded-lg border-0 bg-surface-100 px-3 py-1.5 text-[13px] font-bold text-surface-900 outline-none ring-2 ring-brand-500 dark:bg-surface-900 dark:text-white"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedId(sub.id);
                          setShowEntryForm(false);
                          setSearch("");
                        }}
                        onDoubleClick={() => startEdit(sub)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold transition-colors ${
                          isActive
                            ? "text-brand-600 dark:text-brand-400"
                            : "text-surface-600 hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-200"
                        }`}
                        title="Click to select · Double-click to rename"
                      >
                        {sub.name}
                        <span
                          className={`ml-1 flex h-5 items-center justify-center rounded-md px-1.5 text-[11px] font-bold tabular-nums ${
                            isActive
                              ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                              : "bg-surface-200/60 text-surface-500 dark:bg-surface-700 dark:text-surface-400"
                          }`}
                        >
                          {sub.entries.length}
                        </span>
                      </button>
                    )}

                    {/* Delete Tab Button */}
                    {!isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSubject(sub.id);
                        }}
                        className="mr-2 rounded-md p-1 text-surface-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 group-hover:opacity-100 dark:text-surface-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        title={`Delete ${sub.name}`}
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Soft fade for horizontal scroll */}
            <div className="pointer-events-none absolute bottom-2 right-0 top-0 w-12 bg-gradient-to-l from-surface-50 to-transparent dark:from-surface-950" />
          </div>

          {/* ── Content Area ── */}
          {activeSubject && (
            <div className="rounded-2xl border border-surface-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-surface-800/60 dark:bg-surface-900">
              <div className="p-6">
                {/* Header & Controls */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-extrabold tracking-tight text-surface-900 dark:text-white">
                      {activeSubject.name} Overview
                    </h2>
                    {stats && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-4 text-[13px] font-semibold text-surface-500 dark:text-surface-400">
                        <span className="flex items-center gap-1.5">
                          <Hash size={14} className="text-surface-400" />
                          {stats.total} lecture{stats.total !== 1 ? "s" : ""}
                        </span>
                        {stats.latest && (
                          <span className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-surface-400" />
                            Last updated:{" "}
                            <span className="text-surface-700 dark:text-surface-300">
                              {formatDate(stats.latest)}
                            </span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Search Bar */}
                    {activeSubject.entries.length > 2 && (
                      <div className="relative">
                        <Search
                          size={16}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
                        />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Search topics..."
                          className="w-full min-w-[200px] rounded-xl border border-surface-200 bg-surface-50 py-2 pl-9 pr-4 text-[13px] font-medium text-surface-900 outline-none transition-all placeholder:text-surface-500 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-surface-700 dark:bg-surface-800/50 dark:text-white dark:focus:border-brand-500 dark:focus:bg-surface-900"
                        />
                      </div>
                    )}

                    {/* Toggle Add Form */}
                    {!showEntryForm && (
                      <button
                        onClick={() => setShowEntryForm(true)}
                        className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-50 px-4 py-2 text-[13px] font-bold text-brand-700 transition-colors hover:bg-brand-100 active:scale-95 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20"
                      >
                        <Plus size={16} strokeWidth={2.5} />
                        Add Entry
                      </button>
                    )}
                  </div>
                </div>

                {/* The Add Form */}
                {showEntryForm && (
                  <div className="mb-6">
                    <AddEntryForm
                      onAdd={addEntry}
                      onCancel={() => setShowEntryForm(false)}
                    />
                  </div>
                )}

                {/* Entry List Grid/Rows */}
                {activeSubject.entries.length === 0 ? (
                  <EmptyEntries
                    subjectName={activeSubject.name}
                    onAdd={() => setShowEntryForm(true)}
                  />
                ) : filteredEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-3 rounded-full bg-surface-100 p-3 dark:bg-surface-800">
                      <Search size={24} className="text-surface-400" />
                    </div>
                    <p className="text-[15px] font-bold text-surface-900 dark:text-white">
                      No results found
                    </p>
                    <p className="mt-1 text-[13px] font-medium text-surface-500">
                      We couldn&apos;t find any entries matching &ldquo;{search}
                      &rdquo;
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 rounded-xl bg-surface-50/50 p-2 dark:bg-surface-800/20">
                    {filteredEntries.map((entry, i) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        index={i}
                        onDelete={deleteEntry}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddSubjectModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addSubject}
      />
    </AnimatedPage>
  );
}
