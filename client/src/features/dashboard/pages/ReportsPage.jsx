/**
 * ReportsPage – Comprehensive analytics, event history, and multi-format export
 * ──────────────────────────────────────────────────────────────────────────────
 * Sections:
 *  1. Report Filters     (date range, report type, search)
 *  2. Summary Preview    (6 metric cards)
 *  3. Paginated Table    (event log with sorting)
 *  4. Export / Download   (PDF, Excel .xlsx, CSV, JSON)
 */

import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Droplets,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Radio,
  RefreshCw,
  Search,
  ShieldAlert,
  Users,
  Wind,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTelemetry } from "../context/TelemetryContext";

/* ════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ════════════════════════════════════════════════════════════════ */

const EVENT_DEFS = {
  emergency: {
    icon: ShieldAlert,
    label: "Emergency Triggered",
    category: "alert",
    severity: "critical",
  },
  acRequest: {
    icon: Wind,
    label: "AC Requested",
    category: "alert",
    severity: "info",
  },
  washroom: {
    icon: Droplets,
    label: "Washroom Alert",
    category: "alert",
    severity: "warning",
  },
  teacherAbsent: {
    icon: AlertTriangle,
    label: "Teacher Absent",
    category: "attendance",
    severity: "warning",
  },
  teacherPresent: {
    icon: CheckCircle2,
    label: "Teacher Arrived",
    category: "attendance",
    severity: "info",
  },
  periodChange: {
    icon: Bell,
    label: "Period Changed",
    category: "attendance",
    severity: "info",
  },
  systemOnline: {
    icon: Activity,
    label: "System Online",
    category: "system",
    severity: "info",
  },
  systemOffline: {
    icon: XCircle,
    label: "System Offline",
    category: "system",
    severity: "critical",
  },
  wsConnected: {
    icon: Radio,
    label: "WebSocket Connected",
    category: "system",
    severity: "info",
  },
  wsDisconnected: {
    icon: Radio,
    label: "WebSocket Disconnected",
    category: "system",
    severity: "warning",
  },
};

const REPORT_TYPES = [
  { value: "all", label: "All Events" },
  { value: "attendance", label: "Attendance Report" },
  { value: "alert", label: "Alerts & Emergencies" },
  { value: "system", label: "System Health" },
];

const SEVERITY_STYLES = {
  critical: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
    badge:
      "bg-red-50 text-red-700 ring-red-200/60 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800/40",
  },
  warning: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-900/20 dark:text-amber-400 dark:ring-amber-800/40",
  },
  info: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
    badge:
      "bg-blue-50 text-blue-700 ring-blue-200/60 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-800/40",
  },
};

const ROWS_PER_PAGE = 15;

/* Helpers */
function formatTs(ts) {
  const d = new Date(ts);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function toISODate(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.getTime();
}

function endOfDay(dateStr) {
  const d = new Date(dateStr + "T23:59:59.999");
  return d.getTime();
}

function metaToString(meta) {
  if (!meta) return "";
  return Object.entries(meta)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
}

/* ════════════════════════════════════════════════════════════════
   EXPORT UTILITIES
   ════════════════════════════════════════════════════════════════ */

function buildExportRows(events) {
  return events.map((ev, i) => {
    const def = EVENT_DEFS[ev.type] || EVENT_DEFS.systemOnline;
    return {
      "#": i + 1,
      Date: formatDate(ev.ts),
      Time: formatTime(ev.ts),
      Event: def.label,
      Category: def.category,
      Severity: def.severity,
      Details: ev.detail || def.label,
      Metadata: metaToString(ev.meta),
    };
  });
}

function exportJSON(events, filename) {
  const rows = buildExportRows(events);
  const blob = new Blob([JSON.stringify(rows, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, `${filename}.json`);
}

function exportCSV(events, filename) {
  const rows = buildExportRows(events);
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = String(r[h] || "").replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(",")
    ),
  ];
  const blob = new Blob([csvLines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, `${filename}.csv`);
}

async function exportExcel(events, filename) {
  const XLSX = await import("xlsx");
  const utils = XLSX.utils || XLSX.default?.utils;
  const rows = buildExportRows(events);
  const ws = utils.json_to_sheet(rows);

  /* Auto-width columns */
  const headers = Object.keys(rows[0] || {});
  ws["!cols"] = headers.map((h) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[h] || "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "EduGuard Report");

  /* Write to array buffer and download via Blob (reliable in all browsers) */
  const writeFn = XLSX.write || XLSX.default?.write;
  const wbOut = writeFn(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbOut], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `${filename}.xlsx`);
}

async function exportPDF(events, filename, summaryData) {
  const jspdfModule = await import("jspdf");
  const jsPDF =
    jspdfModule.jsPDF || jspdfModule.default?.jsPDF || jspdfModule.default;
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default || autoTableModule.autoTable;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  /* Header */
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("EduGuard - Event Report", 14, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated on ${new Date().toLocaleString("en-IN")}  |  Total Events: ${events.length}`,
    14,
    25
  );

  /* Summary row */
  if (summaryData) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 14, 34);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    const summaryText = summaryData
      .map((s) => `${s.label}: ${s.value}`)
      .join("   |   ");
    doc.text(summaryText, 14, 39);
  }

  /* Table */
  const rows = buildExportRows(events);
  const headers = Object.keys(rows[0] || {});
  autoTable(doc, {
    startY: summaryData ? 44 : 32,
    head: [headers],
    body: rows.map((r) => headers.map((h) => r[h])),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
    theme: "grid",
  });

  doc.save(`${filename}.pdf`);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════════ */

/* ── Summary Card ── */
function SummaryCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    brand: {
      iconBg:
        "bg-gradient-to-br from-brand-500 to-brand-600 shadow-brand-500/25",
      ring: "ring-brand-100 dark:ring-brand-900/40",
    },
    red: {
      iconBg: "bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/25",
      ring: "ring-red-100 dark:ring-red-900/40",
    },
    amber: {
      iconBg:
        "bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/25",
      ring: "ring-amber-100 dark:ring-amber-900/40",
    },
    blue: {
      iconBg: "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/25",
      ring: "ring-blue-100 dark:ring-blue-900/40",
    },
    emerald: {
      iconBg:
        "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25",
      ring: "ring-emerald-100 dark:ring-emerald-900/40",
    },
    violet: {
      iconBg:
        "bg-gradient-to-br from-violet-500 to-violet-600 shadow-violet-500/25",
      ring: "ring-violet-100 dark:ring-violet-900/40",
    },
  };
  const pal = colors[color] || colors.brand;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-surface-200/80 bg-white p-5 shadow-sm ring-1 ring-inset transition-all hover:shadow-md dark:border-surface-800 dark:bg-surface-900 ${pal.ring}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-surface-400">
            {label}
          </p>
          <p className="text-3xl font-black tabular-nums tracking-tight text-surface-900 dark:text-white">
            {value}
          </p>
          {sub && (
            <p className="text-[11px] font-semibold text-surface-400">{sub}</p>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-lg ${pal.iconBg}`}
        >
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

/* ── Filter Bar ── */
function FilterBar({
  reportType,
  setReportType,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  search,
  setSearch,
  onClear,
  totalFiltered,
  totalAll,
}) {
  return (
    <div className="rounded-2xl border border-surface-200/80 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
      <div className="flex items-center gap-2.5 border-b border-surface-100 px-6 py-4 dark:border-surface-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 shadow-sm">
          <Filter size={15} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-surface-800 dark:text-white">
            Report Filters
          </h3>
          <p className="text-[10px] font-semibold text-surface-400">
            {totalFiltered === totalAll
              ? `Showing all ${totalAll} events`
              : `${totalFiltered} of ${totalAll} events`}
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Report Type */}
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-surface-500">
            Report Type
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3.5 py-2.5 text-sm font-semibold text-surface-800 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
          >
            {REPORT_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-surface-500">
            From Date
          </label>
          <div className="relative">
            <Calendar
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-surface-200 bg-surface-50 py-2.5 pl-9 pr-3.5 text-sm font-semibold text-surface-800 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
            />
          </div>
        </div>

        {/* Date To */}
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-surface-500">
            To Date
          </label>
          <div className="relative">
            <Calendar
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-xl border border-surface-200 bg-surface-50 py-2.5 pl-9 pr-3.5 text-sm font-semibold text-surface-800 outline-none transition-colors focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
            />
          </div>
        </div>

        {/* Search */}
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-surface-500">
            Search Events
          </label>
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by event name…"
              className="w-full rounded-xl border border-surface-200 bg-surface-50 py-2.5 pl-9 pr-3.5 text-sm font-semibold text-surface-800 outline-none transition-colors placeholder:text-surface-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200 dark:placeholder:text-surface-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/40"
            />
          </div>
        </div>
      </div>

      {/* Clear filters */}
      {(reportType !== "all" || dateFrom || dateTo || search) && (
        <div className="border-t border-surface-100 px-5 py-3 dark:border-surface-800">
          <button
            onClick={onClear}
            className="text-xs font-bold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            ✕ Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Data Table ── */
function DataTable({ events, page, setPage }) {
  const totalPages = Math.max(1, Math.ceil(events.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * ROWS_PER_PAGE;
  const pageEvents = events.slice(startIdx, startIdx + ROWS_PER_PAGE);

  /* Generate page buttons with ellipsis */
  const pageButtons = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safePage]);

  return (
    <div className="rounded-2xl border border-surface-200/80 bg-white shadow-sm overflow-hidden dark:border-surface-800 dark:bg-surface-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4 dark:border-surface-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 shadow-sm">
            <BarChart3 size={15} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-surface-800 dark:text-white">
              Event Log
            </h3>
            <p className="text-[10px] font-semibold text-surface-400">
              {events.length} record{events.length !== 1 ? "s" : ""} · Page{" "}
              {safePage} of {totalPages}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-surface-400 dark:text-surface-500">
          <Clock className="animate-pulse" size={28} />
          <p className="text-sm font-semibold">No events match your filters</p>
          <p className="text-xs">
            Events will appear here as triggers are detected
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-surface-100 bg-surface-50/80 dark:border-surface-800 dark:bg-surface-800/50">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                    #
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                    Event
                  </th>
                  <th className="hidden px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 sm:table-cell">
                    Category
                  </th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500">
                    Severity
                  </th>
                  <th className="hidden px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-surface-500 lg:table-cell">
                    Details
                  </th>
                  <th className="px-6 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-surface-500">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100/80 dark:divide-surface-800/60">
                {pageEvents.map((ev, i) => {
                  const def = EVENT_DEFS[ev.type] || EVENT_DEFS.systemOnline;
                  const EvIcon = def.icon;
                  const sevStyle =
                    SEVERITY_STYLES[def.severity] || SEVERITY_STYLES.info;

                  return (
                    <tr
                      key={ev.id}
                      className="transition-colors hover:bg-surface-50/50 dark:hover:bg-surface-800/30"
                    >
                      <td className="px-6 py-3.5 text-xs font-bold tabular-nums text-surface-400">
                        {startIdx + i + 1}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${sevStyle.bg}`}
                          >
                            <EvIcon size={14} className={sevStyle.text} />
                          </div>
                          <span className="text-sm font-bold text-surface-800 dark:text-white">
                            {def.label}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-6 py-3.5 sm:table-cell">
                        <span className="rounded-full bg-surface-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-surface-600 dark:bg-surface-800 dark:text-surface-400">
                          {def.category}
                        </span>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${sevStyle.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${sevStyle.dot}`}
                          />
                          {def.severity}
                        </span>
                      </td>
                      <td className="hidden max-w-[200px] truncate px-6 py-3.5 text-xs font-medium text-surface-500 lg:table-cell">
                        {ev.detail || metaToString(ev.meta) || "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <p className="text-xs font-bold tabular-nums text-surface-700 dark:text-surface-300">
                          {formatTime(ev.ts)}
                        </p>
                        <p className="text-[10px] font-semibold text-surface-400">
                          {formatDate(ev.ts)}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-surface-100 px-6 py-3.5 dark:border-surface-800">
            <p className="text-xs font-semibold text-surface-400">
              Showing {startIdx + 1}–
              {Math.min(startIdx + ROWS_PER_PAGE, events.length)} of{" "}
              {events.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-200 text-surface-500 transition-colors hover:bg-surface-50 disabled:opacity-30 dark:border-surface-700 dark:hover:bg-surface-800"
              >
                <ChevronLeft size={14} />
              </button>
              {pageButtons.map((pg, i) =>
                pg === "..." ? (
                  <span
                    key={`dots-${i}`}
                    className="px-1 text-xs text-surface-400"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                      pg === safePage
                        ? "bg-brand-500 text-white shadow-sm"
                        : "border border-surface-200 text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
                    }`}
                  >
                    {pg}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-200 text-surface-500 transition-colors hover:bg-surface-50 disabled:opacity-30 dark:border-surface-700 dark:hover:bg-surface-800"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Export Panel ── */
function ExportPanel({ events, summaryData, disabled }) {
  const [exporting, setExporting] = useState(null);
  const filename = `EduGuard_Report_${toISODate(Date.now())}`;

  const handleExport = async (format) => {
    if (events.length === 0) return;
    setExporting(format);
    try {
      switch (format) {
        case "xlsx":
          await exportExcel(events, filename);
          break;
        case "pdf":
          await exportPDF(events, filename, summaryData);
          break;
        case "csv":
          exportCSV(events, filename);
          break;
        case "json":
          exportJSON(events, filename);
          break;
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setTimeout(() => setExporting(null), 600);
    }
  };

  const formats = [
    {
      key: "xlsx",
      label: "Excel (.xlsx)",
      desc: "Formatted spreadsheet with auto-width columns",
      icon: FileSpreadsheet,
      primary: true,
      color:
        "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25 focus-visible:ring-emerald-400",
    },
    {
      key: "pdf",
      label: "PDF Report",
      desc: "Professional report with header & summary",
      icon: FileText,
      color:
        "bg-red-600 hover:bg-red-700 shadow-red-500/25 focus-visible:ring-red-400",
    },
    {
      key: "csv",
      label: "CSV",
      desc: "Comma-separated for data analysis tools",
      icon: ArrowDownToLine,
      color:
        "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 focus-visible:ring-blue-400",
    },
    {
      key: "json",
      label: "JSON",
      desc: "Structured data for API / programmatic use",
      icon: FileJson,
      color:
        "bg-violet-600 hover:bg-violet-700 shadow-violet-500/25 focus-visible:ring-violet-400",
    },
  ];

  return (
    <div className="rounded-2xl border border-surface-200/80 bg-white shadow-sm dark:border-surface-800 dark:bg-surface-900">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-surface-100 px-6 py-4 dark:border-surface-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
          <Download size={15} className="text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-surface-800 dark:text-white">
            Export & Download
          </h3>
          <p className="text-[10px] font-semibold text-surface-400">
            {disabled
              ? "No events to export"
              : `${events.length} event${events.length !== 1 ? "s" : ""} ready for export`}
          </p>
        </div>
      </div>

      {/* Format buttons */}
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {formats.map(({ key, label, desc, icon: FmtIcon, primary, color }) => (
          <button
            key={key}
            onClick={() => handleExport(key)}
            disabled={disabled || exporting !== null}
            className={`group relative flex flex-col items-start gap-2 rounded-xl px-5 py-4 text-left text-white shadow-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${color}`}
          >
            {primary && (
              <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-sm">
                Primary
              </span>
            )}
            <div className="flex items-center gap-2">
              {exporting === key ? (
                <Activity className="animate-spin" size={18} />
              ) : (
                <FmtIcon size={18} />
              )}
            </div>
            <span className="text-sm font-bold">{label}</span>
            <span className="text-[11px] leading-tight opacity-75">{desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN — ReportsPage
   ════════════════════════════════════════════════════════════════ */

export default function ReportsPage() {
  const { events: liveEvents, wsStatus } = useTelemetry();

  /* ── DB events ── */
  const [dbEvents, setDbEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchIdRef = useRef(0);

  const API_BASE =
    import.meta.env.VITE_API_BASE_URL ??
    `http://${window.location.hostname}:8080`;

  const fetchEvents = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/events?limit=10000&sort=-ts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (id !== fetchIdRef.current) return; // stale
      setDbEvents(
        (json.data || []).map((ev) => ({
          id: ev._id,
          type: ev.type,
          ts: new Date(ev.ts).getTime(),
          detail: ev.detail,
          meta: ev.meta,
        }))
      );
    } catch (err) {
      if (id === fetchIdRef.current) setError(err.message);
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  /* ── Merge DB events with live events (dedup by type+ts proximity) ── */
  const allEvents = useMemo(() => {
    if (dbEvents.length === 0) return liveEvents;
    if (liveEvents.length === 0) return dbEvents;

    const dbSet = new Set(
      dbEvents.map((e) => `${e.type}:${Math.floor(e.ts / 3000)}`)
    );
    const newLive = liveEvents.filter(
      (e) => !dbSet.has(`${e.type}:${Math.floor(e.ts / 3000)}`)
    );
    const merged = [...newLive, ...dbEvents];
    merged.sort((a, b) => b.ts - a.ts);
    return merged;
  }, [liveEvents, dbEvents]);

  /* ── Filter state ── */
  const [reportType, setReportType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  /* Reset page on filter change */
  const prevFilters = useRef({ reportType, dateFrom, dateTo, search });
  useEffect(() => {
    const pf = prevFilters.current;
    if (
      pf.reportType !== reportType ||
      pf.dateFrom !== dateFrom ||
      pf.dateTo !== dateTo ||
      pf.search !== search
    ) {
      setPage(1);
      prevFilters.current = { reportType, dateFrom, dateTo, search };
    }
  }, [reportType, dateFrom, dateTo, search]);

  /* ── Filtered events ── */
  const filteredEvents = useMemo(() => {
    let result = allEvents;

    /* Report type filter */
    if (reportType !== "all") {
      result = result.filter((ev) => {
        const def = EVENT_DEFS[ev.type];
        return def && def.category === reportType;
      });
    }

    /* Date range */
    if (dateFrom) {
      const from = startOfDay(dateFrom);
      result = result.filter((ev) => ev.ts >= from);
    }
    if (dateTo) {
      const to = endOfDay(dateTo);
      result = result.filter((ev) => ev.ts <= to);
    }

    /* Search */
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((ev) => {
        const def = EVENT_DEFS[ev.type] || {};
        const haystack = [
          def.label,
          def.category,
          def.severity,
          ev.detail,
          metaToString(ev.meta),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return result;
  }, [allEvents, reportType, dateFrom, dateTo, search]);

  /* ── Summary metrics ── */
  const summary = useMemo(() => {
    const counts = {
      periods: 0,
      absences: 0,
      acRequests: 0,
      emergencies: 0,
      washroom: 0,
      system: 0,
    };
    filteredEvents.forEach((ev) => {
      switch (ev.type) {
        case "periodChange":
          counts.periods++;
          break;
        case "teacherAbsent":
          counts.absences++;
          break;
        case "acRequest":
          counts.acRequests++;
          break;
        case "emergency":
          counts.emergencies++;
          break;
        case "washroom":
          counts.washroom++;
          break;
        case "systemOnline":
        case "systemOffline":
        case "wsConnected":
        case "wsDisconnected":
          counts.system++;
          break;
      }
    });
    return counts;
  }, [filteredEvents]);

  const summaryCards = [
    {
      icon: Bell,
      label: "Periods Conducted",
      value: summary.periods,
      sub: "Period changes detected",
      color: "brand",
    },
    {
      icon: Users,
      label: "Teacher Absences",
      value: summary.absences,
      sub: "Grace period breaches",
      color: "violet",
    },
    {
      icon: Wind,
      label: "AC Requests",
      value: summary.acRequests,
      sub: "Requests sent to security dept",
      color: "blue",
    },
    {
      icon: ShieldAlert,
      label: "Emergency Events",
      value: summary.emergencies,
      sub: "Critical alerts fired",
      color: "red",
    },
    {
      icon: Droplets,
      label: "Washroom Alerts",
      value: summary.washroom,
      sub: "Gas threshold breaches",
      color: "amber",
    },
    {
      icon: Activity,
      label: "System Events",
      value: summary.system,
      sub: "Online / offline / WS events",
      color: "emerald",
    },
  ];

  /* For PDF export summary */
  const summaryExportData = summaryCards.map((c) => ({
    label: c.label,
    value: c.value,
  }));

  const clearFilters = () => {
    setReportType("all");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* ═══ Breadcrumb & Title ═══ */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-surface-400 mb-3">
          <Link
            to="/dashboard"
            className="hover:text-brand-500 transition-colors"
          >
            Dashboard
          </Link>
          <ChevronRight size={12} />
          <span className="text-surface-600 dark:text-surface-300">
            Reports
          </span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-surface-900 dark:text-white">
              Reports & Analytics
            </h1>
            <p className="mt-1 text-sm font-medium text-surface-500">
              Persistent event history, analytics summaries & data export
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchEvents}
              disabled={loading}
              title="Refresh events from database"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-surface-200 text-surface-500 transition-all hover:bg-surface-50 hover:text-brand-600 disabled:opacity-40 dark:border-surface-700 dark:hover:bg-surface-800 dark:hover:text-brand-400"
            >
              {loading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
            </button>
            <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-600 ring-1 ring-brand-200/60 dark:bg-brand-900/20 dark:text-brand-400 dark:ring-brand-800/40">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />
              {allEvents.length} Total Events
            </span>
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset ${
                wsStatus === "connected"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:ring-emerald-800"
                  : "bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-800"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  wsStatus === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-red-500"
                }`}
              />
              {wsStatus === "connected" ? "Live" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Error Banner ═══ */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          <XCircle size={16} />
          Failed to load events from database: {error}
          <button
            onClick={fetchEvents}
            className="ml-auto text-xs font-bold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ═══ Filter Bar ═══ */}
      <FilterBar
        reportType={reportType}
        setReportType={setReportType}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        search={search}
        setSearch={setSearch}
        onClear={clearFilters}
        totalFiltered={filteredEvents.length}
        totalAll={allEvents.length}
      />

      {/* ═══ Summary Cards ═══ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>

      {/* ═══ Data Table ═══ */}
      <DataTable events={filteredEvents} page={page} setPage={setPage} />

      {/* ═══ Export Panel ═══ */}
      <ExportPanel
        events={filteredEvents}
        summaryData={summaryExportData}
        disabled={filteredEvents.length === 0}
      />
    </div>
  );
}
