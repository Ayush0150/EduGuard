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

  // Reset name + focus when the modal opens
  useEffect(() => {
    if (open) {
      // Use a microtask to reset so it doesn't count as synchronous setState
      queueMicrotask(() => setName(""));
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
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
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      {/* Panel */}
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-sm animate-scale-in rounded-2xl border border-surface-200/80 bg-white p-6 shadow-xl dark:border-surface-700 dark:bg-surface-900"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 shadow-sm shadow-brand-600/20">
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-surface-900 dark:text-white">
              Add Subject
            </h3>
            <p className="text-[11px] text-surface-400">
              Create a new subject tab to track lectures.
            </p>
          </div>
        </div>

        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-surface-400">
          Subject Name <span className="text-red-400">*</span>
        </label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mathematics, Physics, History"
          maxLength={50}
          className="w-full rounded-xl border border-surface-200 bg-surface-50/50 px-3.5 py-2.5 text-sm text-surface-900 outline-none transition-all placeholder:text-surface-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800/60 dark:text-surface-100 dark:placeholder:text-surface-500 dark:focus:border-brand-500 dark:focus:bg-surface-800 dark:focus:ring-brand-900/30"
        />

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition-all hover:bg-brand-700 hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={14} />
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
    "w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm text-surface-900 outline-none transition-all placeholder:text-surface-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:placeholder:text-surface-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/30";

  return (
    <form
      onSubmit={handleSubmit}
      className="animate-fade-in rounded-xl border border-brand-200/60 bg-brand-50/30 p-4 dark:border-brand-800/40 dark:bg-brand-950/20"
    >
      <div className="mb-3 flex items-center gap-2">
        <Pencil size={13} className="text-brand-500" />
        <span className="text-xs font-bold text-brand-700 dark:text-brand-400">
          New Lecture Entry
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-surface-400">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-surface-400">
            Topic <span className="text-red-400">*</span>
          </label>
          <input
            ref={topicRef}
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Lecture topic…"
            maxLength={120}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-surface-400">
            Pages / Portion
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

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-surface-500 transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!topic.trim()}
          className="flex items-center gap-1 rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={12} />
          Add Entry
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
    <div className="group flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/40">
      {/* Row number */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-100 text-[11px] font-bold tabular-nums text-surface-400 dark:bg-surface-800 dark:text-surface-500">
        {index + 1}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold leading-snug text-surface-900 dark:text-white">
          {entry.topic}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1 text-[11px] font-medium text-surface-400">
            <Calendar size={11} />
            {formatDate(entry.date)}
            {rel && (
              <span className="ml-0.5 text-[10px] text-brand-500 dark:text-brand-400">
                ({rel})
              </span>
            )}
          </span>
          {entry.pages && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-surface-400">
              <FileText size={11} />
              {entry.pages}
            </span>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(entry.id)}
        className="shrink-0 rounded-md p-1.5 text-surface-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-surface-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        title="Delete entry"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   EMPTY STATE
   ═══════════════════════════════════════════════════════════════ */
function EmptySubjects({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-200 bg-surface-50/50 py-20 dark:border-surface-700 dark:bg-surface-800/20">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-950/40">
        <Layers size={24} className="text-brand-500" />
      </div>
      <h3 className="text-base font-bold text-surface-800 dark:text-white">
        No subjects yet
      </h3>
      <p className="mt-1 max-w-xs text-center text-xs text-surface-400">
        Add your first subject to start tracking lecture progress, topics
        covered, and syllabus completion.
      </p>
      <button
        onClick={onAdd}
        className="mt-5 flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition-all hover:bg-brand-700 hover:shadow-md active:scale-[0.97]"
      >
        <Plus size={14} />
        Add Subject
      </button>
    </div>
  );
}

function EmptyEntries({ subjectName, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-100 dark:bg-surface-800">
        <BookOpen size={20} className="text-surface-400" />
      </div>
      <p className="text-sm font-semibold text-surface-600 dark:text-surface-300">
        No lectures logged for {subjectName}
      </p>
      <p className="mt-1 max-w-xs text-xs text-surface-400">
        Start by adding your first lecture entry with the date, topic, and pages
        covered.
      </p>
      <button
        onClick={onAdd}
        className="mt-4 flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.97]"
      >
        <Plus size={12} />
        Add Lecture Entry
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

  /* Persist to localStorage on every change */
  useEffect(() => {
    saveSubjects(subjects);
  }, [subjects]);

  /* Derived active ID — falls back to first subject if selection is invalid */
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

  /* ── Subject CRUD ── */
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

  /* ── Entry CRUD ── */
  const addEntry = useCallback(
    ({ date, topic, pages }) => {
      if (!activeId) return;
      setSubjects((prev) =>
        prev.map((s) => {
          if (s.id !== activeId) return s;
          const entries = [
            { id: uid(), date, topic, pages },
            ...s.entries,
          ].slice(0, MAX_ENTRIES);
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

  /* ── Stats for active subject ── */
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 shadow-md shadow-brand-600/20">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-surface-900 dark:text-white">
              Subject Tracker
            </h1>
            <p className="text-xs text-surface-400">
              Log lectures, track topics &amp; syllabus progress
            </p>
          </div>
        </div>

        {subjects.length > 0 && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 transition-all hover:bg-brand-700 hover:shadow-md active:scale-[0.97] sm:self-auto"
          >
            <Plus size={14} />
            Add Subject
          </button>
        )}
      </div>

      {subjects.length === 0 ? (
        <EmptySubjects onAdd={() => setShowAddModal(true)} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-surface-200/80 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
          {/* ── Subject Tabs ── */}
          <div className="border-b border-surface-100 bg-surface-50/60 dark:border-surface-800 dark:bg-surface-800/30">
            <div className="flex items-center gap-1 overflow-x-auto px-3 pt-2 scrollbar-hide">
              {subjects.map((sub) => {
                const isActive = sub.id === activeId;
                const isEditing = sub.id === editingId;

                return (
                  <div
                    key={sub.id}
                    className={`group relative flex shrink-0 items-center rounded-t-lg transition-all ${
                      isActive
                        ? "bg-white dark:bg-surface-900"
                        : "hover:bg-surface-100/70 dark:hover:bg-surface-700/30"
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
                        className="mx-1 my-1 w-28 rounded-md border border-brand-300 bg-white px-2 py-1 text-xs font-medium text-surface-900 outline-none focus:ring-2 focus:ring-brand-200 dark:border-brand-600 dark:bg-surface-800 dark:text-white"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedId(sub.id);
                          setShowEntryForm(false);
                          setSearch("");
                        }}
                        onDoubleClick={() => startEdit(sub)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold transition-colors ${
                          isActive
                            ? "text-brand-600 dark:text-brand-400"
                            : "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
                        }`}
                        title="Click to select · Double-click to rename"
                      >
                        <BookOpen size={12} />
                        {sub.name}
                        <span
                          className={`ml-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                            isActive
                              ? "bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400"
                              : "bg-surface-100 text-surface-400 dark:bg-surface-700 dark:text-surface-500"
                          }`}
                        >
                          {sub.entries.length}
                        </span>
                      </button>
                    )}

                    {/* Delete tab (on hover) */}
                    {!isEditing && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSubject(sub.id);
                        }}
                        className="mr-1 rounded p-0.5 text-surface-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:text-surface-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        title={`Remove ${sub.name}`}
                      >
                        <X size={12} />
                      </button>
                    )}

                    {/* Active indicator line */}
                    {isActive && (
                      <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-brand-600 dark:bg-brand-400" />
                    )}
                  </div>
                );
              })}

              {/* Inline add tab button */}
              {subjects.length < MAX_SUBJECTS && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="ml-1 flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-700 dark:hover:text-surface-300"
                >
                  <Plus size={12} />
                  Add
                </button>
              )}
            </div>
          </div>

          {/* ── Content Panel ── */}
          {activeSubject && (
            <div className="p-5 sm:p-6">
              {/* Subject header + stats */}
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-extrabold tracking-tight text-surface-900 dark:text-white">
                    {activeSubject.name}
                  </h2>
                  <div className="mt-1 flex items-center gap-3 text-[11px] font-medium text-surface-400">
                    {stats && (
                      <>
                        <span className="flex items-center gap-1">
                          <Hash size={11} />
                          {stats.total} lecture{stats.total !== 1 ? "s" : ""}{" "}
                          logged
                        </span>
                        {stats.latest && (
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            Last: {formatDate(stats.latest)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Search */}
                  {activeSubject.entries.length > 3 && (
                    <div className="relative">
                      <Search
                        size={13}
                        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400"
                      />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search entries…"
                        className="w-44 rounded-lg border border-surface-200 bg-surface-50/80 py-1.5 pl-8 pr-3 text-xs text-surface-700 outline-none transition-all placeholder:text-surface-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800/60 dark:text-surface-200 dark:placeholder:text-surface-500 dark:focus:border-brand-600 dark:focus:ring-brand-900/30"
                      />
                    </div>
                  )}

                  {/* Add entry toggle */}
                  {!showEntryForm && (
                    <button
                      onClick={() => setShowEntryForm(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.97]"
                    >
                      <Plus size={13} />
                      Add Entry
                    </button>
                  )}
                </div>
              </div>

              {/* Inline add form */}
              {showEntryForm && (
                <div className="mb-5">
                  <AddEntryForm
                    onAdd={(entry) => {
                      addEntry(entry);
                    }}
                    onCancel={() => setShowEntryForm(false)}
                  />
                </div>
              )}

              {/* Entries list */}
              {activeSubject.entries.length === 0 ? (
                <EmptyEntries
                  subjectName={activeSubject.name}
                  onAdd={() => setShowEntryForm(true)}
                />
              ) : filteredEntries.length === 0 ? (
                <div className="py-12 text-center">
                  <Search
                    size={20}
                    className="mx-auto mb-2 text-surface-300 dark:text-surface-600"
                  />
                  <p className="text-sm font-medium text-surface-400">
                    No entries match &ldquo;{search}&rdquo;
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-surface-100/80 dark:divide-surface-800/60">
                  {/* Column headers */}
                  <div className="flex items-center gap-3 px-3 pb-2">
                    <div className="w-7" />
                    <div className="flex flex-1 items-center gap-6 text-[10px] font-bold uppercase tracking-wider text-surface-300 dark:text-surface-600">
                      <span>Topic</span>
                    </div>
                  </div>

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
          )}
        </div>
      )}

      {/* Add Subject Modal */}
      <AddSubjectModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addSubject}
      />
    </AnimatedPage>
  );
}
