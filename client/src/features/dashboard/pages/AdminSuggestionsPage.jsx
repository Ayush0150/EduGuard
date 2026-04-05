/**
 * AdminSuggestionsPage
 * ────────────────────
 * Displays all user suggestions/feedback from the database.
 * Three tabs: All Suggestions · Workspace (in-progress) · Completed (done).
 * Features: search, category filter, sorting, pagination, status actions,
 *           delete with confirmation, spam word filtering.
 */

import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Clock,
  Filter,
  Hammer,
  Inbox,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AnimatedPage from "../../../core/components/AnimatedPage";
import { API_BASE_URL } from "../../../core/config/runtime";
import { withAuthHeaders } from "../../../core/http/authHeaders";

/* ════════════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  { value: "", label: "All Categories" },
  { value: "general", label: "General" },
  { value: "feature", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
  { value: "improvement", label: "Improvement" },
  { value: "other", label: "Other" },
];

const PAGE_SIZES = [10, 20, 50, 100];

const TABS = [
  { key: "", label: "All Suggestions", icon: MessageSquare, statusFilter: "" },
  {
    key: "workspace",
    label: "Workspace",
    icon: Hammer,
    statusFilter: "workspace",
  },
  { key: "done", label: "Completed", icon: CheckCircle2, statusFilter: "done" },
];

const CATEGORY_STYLES = {
  general:
    "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-800/40",
  feature:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:ring-violet-800/40",
  bug: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800/40",
  improvement:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800/40",
  other:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800/40",
};

const STATUS_STYLES = {
  pending:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800/40",
  workspace:
    "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-800/40",
  done: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800/40",
};

const STATUS_LABELS = {
  pending: "Pending",
  workspace: "In Workspace",
  done: "Done",
};

/* ════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════ */

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(iso);
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════════════════════════════ */

export default function AdminSuggestionsPage() {
  /* ── state ── */
  const [suggestions, setSuggestions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // id being acted on
  const [deleteConfirm, setDeleteConfirm] = useState(null); // id pending delete

  // tabs & filters
  const [activeTab, setActiveTab] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);

  // tab counts
  const [tabCounts, setTabCounts] = useState({ all: 0, workspace: 0, done: 0 });

  const debounceRef = useRef(null);

  /* ── debounced search ── */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  /* ── fetch tab counts ── */
  const fetchTabCounts = useCallback(async () => {
    try {
      const [allRes, wsRes, doneRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/suggestions?limit=1`, {
          headers: withAuthHeaders(),
        }).then((r) => r.json()),
        fetch(
          `${API_BASE_URL}/api/v1/suggestions?status=workspace&limit=1`,
          {
            headers: withAuthHeaders(),
          }
        ).then((r) => r.json()),
        fetch(`${API_BASE_URL}/api/v1/suggestions?status=done&limit=1`, {
          headers: withAuthHeaders(),
        }).then((r) => r.json()),
      ]);
      setTabCounts({
        all: allRes.pagination?.total ?? 0,
        workspace: wsRes.pagination?.total ?? 0,
        done: doneRes.pagination?.total ?? 0,
      });
    } catch {
      /* silent */
    }
  }, []);

  /* ── fetch suggestions ── */
  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(pageSize),
        sortBy,
        sortOrder,
      });
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (category) params.set("category", category);
      if (activeTab) params.set("status", activeTab);

      const res = await fetch(`${API_BASE_URL}/api/v1/suggestions?${params}`, {
        headers: withAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);

      const json = await res.json();
      setSuggestions(json.data ?? []);
      setPagination(
        json.pagination ?? { page: 1, limit: pageSize, total: 0, pages: 0 }
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    debouncedSearch,
    category,
    activeTab,
  ]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  useEffect(() => {
    fetchTabCounts();
  }, [fetchTabCounts]);

  /* ── status update ── */
  const updateStatus = useCallback(
    async (id, newStatus) => {
      setActionLoading(id);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/v1/suggestions/${id}/status`,
          {
            method: "PATCH",
            headers: withAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ status: newStatus }),
          }
        );
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.message || `Failed (${res.status})`);
        }
        // optimistic: update local state
        setSuggestions((prev) =>
          prev.map((s) => (s._id === id ? { ...s, status: newStatus } : s))
        );
        fetchTabCounts();
      } catch (err) {
        setError(err.message);
      } finally {
        setActionLoading(null);
      }
    },
    [fetchTabCounts]
  );

  /* ── delete ── */
  const handleDelete = useCallback(
    async (id) => {
      setActionLoading(id);
      setDeleteConfirm(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/suggestions/${id}`, {
          method: "DELETE",
          headers: withAuthHeaders(),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.message || `Failed (${res.status})`);
        }
        setSuggestions((prev) => prev.filter((s) => s._id !== id));
        setPagination((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
        }));
        fetchTabCounts();
      } catch (err) {
        setError(err.message);
      } finally {
        setActionLoading(null);
      }
    },
    [fetchTabCounts]
  );

  /* ── handlers ── */
  const goToPage = (p) =>
    setCurrentPage(Math.max(1, Math.min(p, pagination.pages)));
  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCategory("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const switchTab = (tabKey) => {
    setActiveTab(tabKey);
    setCurrentPage(1);
    setExpandedRow(null);
  };

  const hasFilters =
    debouncedSearch ||
    category ||
    sortBy !== "createdAt" ||
    sortOrder !== "desc";

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  /* ── render ── */
  return (
    <AnimatedPage>
      {/* ═══ Header ═══ */}
      <div>
        <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-surface-400">
          <Link to="/admin" className="transition-colors hover:text-brand-500">
            Admin
          </Link>
          <ChevronRight size={12} />
          <span className="text-surface-600 dark:text-surface-300">
            Suggestions
          </span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-surface-900 dark:text-white">
              User Suggestions
            </h1>
            <p className="mt-1 text-sm font-medium text-surface-500">
              Manage feedback — review, move to workspace, mark done, or delete
            </p>
          </div>
          <button
            onClick={() => {
              fetchSuggestions();
              fetchTabCounts();
            }}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/20 transition-all hover:bg-brand-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ═══ Tabs ═══ */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-surface-200 bg-white p-1 shadow-sm dark:border-surface-800 dark:bg-surface-900">
        {TABS.map((tab) => {
          const count =
            tab.key === ""
              ? tabCounts.all
              : tab.key === "workspace"
                ? tabCounts.workspace
                : tabCounts.done;
          const active = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-all ${
                active
                  ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                  : "text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-300"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span
                className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-black tabular-nums ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ═══ Filters Bar ═══ */}
      <div className="rounded-xl border border-surface-200 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
        <div className="flex items-center gap-2 border-b border-surface-100 px-5 py-3 dark:border-surface-800">
          <SlidersHorizontal size={14} className="text-surface-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-surface-400">
            Filters
          </span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <X size={10} />
              Clear All
            </button>
          )}
        </div>

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or message…"
              className="w-full rounded-lg border border-surface-200 bg-surface-50 py-2.5 pl-10 pr-4 text-sm font-semibold text-surface-800 outline-none transition-all placeholder:text-surface-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:placeholder:text-surface-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter
              size={14}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400"
            />
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none rounded-lg border border-surface-200 bg-surface-50 py-2.5 pl-10 pr-10 text-sm font-semibold text-surface-800 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="appearance-none rounded-lg border border-surface-200 bg-surface-50 px-4 py-2.5 text-sm font-semibold text-surface-800 outline-none transition-all focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ═══ Error Banner ═══ */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5 dark:border-red-800 dark:bg-red-900/20">
          <AlertTriangle
            size={16}
            className="shrink-0 text-red-600 dark:text-red-400"
          />
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">
            {error}
          </p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-xs font-bold text-red-600 hover:text-red-800 dark:text-red-400"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═══ Delete Confirmation Modal ═══ */}
      {deleteConfirm && (
        <DeleteModal
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* ═══ Table ═══ */}
      <div className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
        {/* Loading overlay */}
        {loading && suggestions.length > 0 && (
          <div className="flex items-center gap-2 border-b border-brand-100 bg-brand-50/60 px-5 py-2 dark:border-brand-900/40 dark:bg-brand-900/10">
            <Loader2 size={14} className="animate-spin text-brand-600" />
            <span className="text-xs font-semibold text-brand-700 dark:text-brand-400">
              Refreshing…
            </span>
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50/80 dark:border-surface-800 dark:bg-surface-800/50">
                <th className="px-4 py-3 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                    #
                  </span>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => toggleSort("name")}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-surface-400 transition-colors hover:text-surface-600"
                  >
                    Name
                    <SortIndicator
                      field="name"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                    />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => toggleSort("category")}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-surface-400 transition-colors hover:text-surface-600"
                  >
                    Category
                    <SortIndicator
                      field="category"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                    />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                    Message
                  </span>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                    Status
                  </span>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => toggleSort("createdAt")}
                    className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-surface-400 transition-colors hover:text-surface-600"
                  >
                    Date
                    <SortIndicator
                      field="createdAt"
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                    />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {!loading && suggestions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <EmptyState
                      hasFilters={hasFilters}
                      onClear={clearFilters}
                      activeTab={activeTab}
                    />
                  </td>
                </tr>
              )}

              {loading && suggestions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2
                        size={28}
                        className="animate-spin text-brand-500"
                      />
                      <p className="text-sm font-semibold text-surface-500">
                        Loading suggestions…
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {suggestions.map((s, idx) => {
                const rowNum =
                  (pagination.page - 1) * pagination.limit + idx + 1;
                const isExpanded = expandedRow === s._id;
                const isActing = actionLoading === s._id;

                return (
                  <tr
                    key={s._id}
                    className={`group transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50 ${
                      s.status === "done" ? "opacity-60" : ""
                    }`}
                  >
                    <td className="px-4 py-4 align-top">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-100 text-xs font-bold text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                        {rowNum}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/20">
                          <User
                            size={14}
                            className="text-brand-600 dark:text-brand-400"
                          />
                        </div>
                        <span className="text-sm font-bold text-surface-800 dark:text-white">
                          {s.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${
                          CATEGORY_STYLES[s.category] || CATEGORY_STYLES.general
                        }`}
                      >
                        {s.category}
                      </span>
                    </td>
                    <td className="max-w-sm px-4 py-4 align-top">
                      <p
                        onClick={() =>
                          setExpandedRow(isExpanded ? null : s._id)
                        }
                        className={`cursor-pointer text-sm font-medium leading-relaxed text-surface-600 dark:text-surface-400 ${
                          isExpanded ? "" : "line-clamp-2"
                        }`}
                      >
                        {s.message}
                      </p>
                      {!isExpanded && s.message.length > 100 && (
                        <button
                          onClick={() => setExpandedRow(s._id)}
                          className="mt-1 text-[10px] font-bold text-brand-500 hover:text-brand-600"
                        >
                          Show more
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${
                          STATUS_STYLES[s.status] || STATUS_STYLES.pending
                        }`}
                      >
                        {STATUS_LABELS[s.status] || "Pending"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 align-top">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-surface-700 dark:text-surface-300">
                          {formatDate(s.createdAt)}
                        </span>
                        <span className="text-[10px] font-medium text-surface-400">
                          {formatTime(s.createdAt)}
                        </span>
                        <span className="mt-0.5 text-[10px] font-semibold text-brand-500">
                          {timeAgo(s.createdAt)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-center justify-end gap-1">
                        {isActing ? (
                          <Loader2
                            size={14}
                            className="animate-spin text-brand-500"
                          />
                        ) : (
                          <>
                            {/* Move to Workspace */}
                            {s.status !== "workspace" && (
                              <ActionBtn
                                title="Move to Workspace"
                                className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                onClick={() => updateStatus(s._id, "workspace")}
                              >
                                <Hammer size={13} />
                              </ActionBtn>
                            )}
                            {/* Mark Done */}
                            {s.status !== "done" && (
                              <ActionBtn
                                title="Mark as Done"
                                className="text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                onClick={() => updateStatus(s._id, "done")}
                              >
                                <CheckCircle2 size={13} />
                              </ActionBtn>
                            )}
                            {/* Reopen (back to pending) */}
                            {s.status !== "pending" && (
                              <ActionBtn
                                title="Reopen (Pending)"
                                className="text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                onClick={() => updateStatus(s._id, "pending")}
                              >
                                <Archive size={13} />
                              </ActionBtn>
                            )}
                            {/* Delete */}
                            <ActionBtn
                              title="Delete"
                              className="text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                              onClick={() => setDeleteConfirm(s._id)}
                            >
                              <Trash2 size={13} />
                            </ActionBtn>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-0 divide-y divide-surface-100 md:hidden dark:divide-surface-800">
          {!loading && suggestions.length === 0 && (
            <div className="px-5 py-16">
              <EmptyState
                hasFilters={hasFilters}
                onClear={clearFilters}
                activeTab={activeTab}
              />
            </div>
          )}

          {loading && suggestions.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 size={28} className="animate-spin text-brand-500" />
              <p className="text-sm font-semibold text-surface-500">
                Loading suggestions…
              </p>
            </div>
          )}

          {suggestions.map((s, idx) => {
            const rowNum = (pagination.page - 1) * pagination.limit + idx + 1;
            const isExpanded = expandedRow === s._id;
            const isActing = actionLoading === s._id;

            return (
              <div
                key={s._id}
                className={`p-5 transition-colors ${s.status === "done" ? "opacity-60" : ""}`}
              >
                {/* Top row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-100 text-xs font-bold text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                      {rowNum}
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/20">
                      <User
                        size={14}
                        className="text-brand-600 dark:text-brand-400"
                      />
                    </div>
                    <span className="text-sm font-bold text-surface-800 dark:text-white">
                      {s.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-inset ${
                        STATUS_STYLES[s.status] || STATUS_STYLES.pending
                      }`}
                    >
                      {STATUS_LABELS[s.status] || "Pending"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ring-inset ${
                        CATEGORY_STYLES[s.category] || CATEGORY_STYLES.general
                      }`}
                    >
                      {s.category}
                    </span>
                  </div>
                </div>

                {/* Message */}
                <p
                  onClick={() => setExpandedRow(isExpanded ? null : s._id)}
                  className={`mt-3 cursor-pointer text-sm font-medium leading-relaxed text-surface-600 dark:text-surface-400 ${
                    isExpanded ? "" : "line-clamp-3"
                  }`}
                >
                  {s.message}
                </p>

                {/* Footer: date + actions */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-semibold text-surface-400">
                    <Clock size={10} />
                    {formatDate(s.createdAt)} · {formatTime(s.createdAt)}
                    <span className="text-brand-500">
                      {timeAgo(s.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isActing ? (
                      <Loader2
                        size={14}
                        className="animate-spin text-brand-500"
                      />
                    ) : (
                      <>
                        {s.status !== "workspace" && (
                          <ActionBtn
                            title="Workspace"
                            className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            onClick={() => updateStatus(s._id, "workspace")}
                          >
                            <Hammer size={12} />
                          </ActionBtn>
                        )}
                        {s.status !== "done" && (
                          <ActionBtn
                            title="Done"
                            className="text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                            onClick={() => updateStatus(s._id, "done")}
                          >
                            <CheckCircle2 size={12} />
                          </ActionBtn>
                        )}
                        {s.status !== "pending" && (
                          <ActionBtn
                            title="Reopen"
                            className="text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            onClick={() => updateStatus(s._id, "pending")}
                          >
                            <Archive size={12} />
                          </ActionBtn>
                        )}
                        <ActionBtn
                          title="Delete"
                          className="text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          onClick={() => setDeleteConfirm(s._id)}
                        >
                          <Trash2 size={12} />
                        </ActionBtn>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ═══ Pagination ═══ */}
        {pagination.pages > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-surface-100 px-5 py-4 sm:flex-row dark:border-surface-800">
            <p className="text-xs font-semibold text-surface-400">
              Showing{" "}
              <span className="font-bold text-surface-700 dark:text-surface-300">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>
              –
              <span className="font-bold text-surface-700 dark:text-surface-300">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-surface-700 dark:text-surface-300">
                {pagination.total}
              </span>
            </p>

            <div className="flex items-center gap-1">
              <PaginationBtn
                onClick={() => goToPage(1)}
                disabled={pagination.page <= 1}
                title="First page"
              >
                <ChevronsLeft size={14} />
              </PaginationBtn>
              <PaginationBtn
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                title="Previous page"
              >
                <ChevronLeft size={14} />
              </PaginationBtn>

              {getPageNumbers(pagination.page, pagination.pages).map((p, i) =>
                p === "…" ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="px-1 text-xs text-surface-400"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-xs font-bold transition-all ${
                      p === pagination.page
                        ? "bg-brand-600 text-white shadow-lg shadow-brand-500/20"
                        : "text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              <PaginationBtn
                onClick={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                title="Next page"
              >
                <ChevronRight size={14} />
              </PaginationBtn>
              <PaginationBtn
                onClick={() => goToPage(pagination.pages)}
                disabled={pagination.page >= pagination.pages}
                title="Last page"
              >
                <ChevronsRight size={14} />
              </PaginationBtn>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Stats Summary ═══ */}
      {!loading && tabCounts.all > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total"
            value={tabCounts.all}
            icon={MessageSquare}
            color="from-brand-500 to-brand-600"
          />
          <StatCard
            label="Pending"
            value={Math.max(
              0,
              tabCounts.all - tabCounts.workspace - tabCounts.done
            )}
            icon={ClipboardList}
            color="from-amber-500 to-amber-600"
          />
          <StatCard
            label="In Workspace"
            value={tabCounts.workspace}
            icon={Hammer}
            color="from-blue-500 to-blue-600"
          />
          <StatCard
            label="Completed"
            value={tabCounts.done}
            icon={CheckCircle2}
            color="from-emerald-500 to-emerald-600"
          />
        </div>
      )}
    </AnimatedPage>
  );
}

/* ════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════════ */

function ActionBtn({ onClick, title, className = "", children }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${className}`}
    >
      {children}
    </button>
  );
}

function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-surface-200 bg-white p-6 shadow-2xl dark:border-surface-700 dark:bg-surface-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Trash2 size={18} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-surface-900 dark:text-white">
              Delete Suggestion?
            </h3>
            <p className="text-xs font-medium text-surface-500">
              This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-surface-200 bg-white px-4 py-2 text-sm font-bold text-surface-600 transition-all hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function SortIndicator({ field, sortBy, sortOrder }) {
  if (sortBy !== field) {
    return <span className="text-surface-300 dark:text-surface-600">↕</span>;
  }
  return (
    <span className="text-brand-500">{sortOrder === "asc" ? "↑" : "↓"}</span>
  );
}

function PaginationBtn({ onClick, disabled, title, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-surface-500 transition-all hover:bg-surface-100 hover:text-surface-700 disabled:cursor-not-allowed disabled:opacity-30 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
      <div className="flex items-center gap-3 p-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg`}
        >
          <Icon size={16} className="text-white" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-surface-400">
            {label}
          </p>
          <p className="text-xl font-black tabular-nums text-surface-800 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasFilters, onClear, activeTab }) {
  const messages = {
    "": {
      title: "No suggestions yet",
      sub: "Suggestions submitted by users will appear here",
    },
    workspace: {
      title: "Workspace is empty",
      sub: "Move suggestions here to track work in progress",
    },
    done: {
      title: "No completed suggestions",
      sub: "Suggestions marked as done will appear here",
    },
  };
  const msg = messages[activeTab] || messages[""];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
        <Inbox size={24} className="text-surface-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-surface-700 dark:text-surface-300">
          {hasFilters ? "No matching suggestions" : msg.title}
        </p>
        <p className="mt-1 max-w-xs text-xs font-medium text-surface-400">
          {hasFilters ? "Try adjusting your search or filters" : msg.sub}
        </p>
      </div>
      {hasFilters && (
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-lg bg-brand-50 px-4 py-2 text-xs font-bold text-brand-600 transition-colors hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/30"
        >
          <X size={12} />
          Clear Filters
        </button>
      )}
    </div>
  );
}

/* ── Page number generator for pagination ── */
function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = [];
  pages.push(1);

  if (current > 3) pages.push("…");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("…");

  pages.push(total);
  return pages;
}
