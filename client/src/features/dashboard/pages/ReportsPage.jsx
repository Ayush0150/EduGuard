/**
 * ReportsPage – Comprehensive analytics, event history, and multi-format export
 * ──────────────────────────────────────────────────────────────────────────────
 * Sections:
 * 1. Report Filters     (date range, report type, search)
 * 2. Summary Preview    (6 metric cards)
 * 3. Paginated Table    (event log with sorting)
 * 4. Export / Download   (PDF, Excel .xlsx, CSV, JSON)
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
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  Wind,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AnimatedPage from "../../../core/components/AnimatedPage";
import PasswordConfirmModal from "../../../core/components/PasswordConfirmModal";
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
};

const REPORT_TYPES = [
  { value: "all", label: "All Events" },
  { value: "attendance", label: "Attendance Report" },
  { value: "alert", label: "Alerts & Emergencies" },
];

const SEVERITY_STYLES = {
  critical: {
    bg: "bg-red-100 dark:bg-red-500/10",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]",
    badge:
      "bg-red-50 text-red-700 ring-red-200/60 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-900/30",
  },
  warning: {
    bg: "bg-amber-100 dark:bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]",
    badge:
      "bg-amber-50 text-amber-700 ring-amber-200/60 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-900/30",
  },
  info: {
    bg: "bg-blue-100 dark:bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]",
    badge:
      "bg-blue-50 text-blue-700 ring-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-900/30",
  },
};

const ROWS_PER_PAGE = 15;

/* Helpers */

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
    const def = EVENT_DEFS[ev.type] || EVENT_DEFS.periodChange;
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

function exportJSON(events, filename, { classroom, summaryData } = {}) {
  const rows = buildExportRows(events);
  const output = {
    report: {
      title: "EduGuard Event Report",
      classroom: classroom || "—",
      generatedAt: new Date().toLocaleString("en-IN"),
      totalEvents: events.length,
      systemVersion: "6.0.0",
      generatedBy: "EduGuard IoT System",
    },
    summary: (summaryData || []).reduce((acc, s) => {
      acc[s.label] = s.value;
      return acc;
    }, {}),
    events: rows,
  };
  const blob = new Blob([JSON.stringify(output, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, `${filename}.json`);
}

function exportCSV(events, filename, { classroom, summaryData } = {}) {
  const rows = buildExportRows(events);
  if (rows.length === 0) return;
  const now = new Date().toLocaleString("en-IN");
  const headers = Object.keys(rows[0]);
  const meta = [
    `"EduGuard Event Report"`,
    `"Classroom: ${classroom || "—"}"`,
    `"Generated: ${now}"`,
    `"Total Events: ${events.length}"`,
    `"System Version: 6.0.0"`,
    "",
  ];
  if (summaryData && summaryData.length > 0) {
    meta.push(`"Summary"`);
    meta.push(summaryData.map((s) => `"${s.label}: ${s.value}"`).join(","));
    meta.push("");
  }
  const csvLines = [
    ...meta,
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const val = String(r[h] || "").replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(",")
    ),
    "",
    `"Generated by EduGuard IoT System | ${now} | v6.0.0"`,
  ];
  const blob = new Blob([csvLines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, `${filename}.csv`);
}

async function exportExcel(events, filename, { classroom, summaryData } = {}) {
  const XLSX = await import("xlsx");
  const utils = XLSX.utils || XLSX.default?.utils;
  const now = new Date().toLocaleString("en-IN");
  const rows = buildExportRows(events);
  const headers = Object.keys(rows[0] || {});
  const colCount = headers.length;

  /* Build header rows */
  const headerRows = [
    ["EduGuard Event Report"],
    [`Classroom: ${classroom || "—"}`],
    [`Generated: ${now}`],
    [`Total Events: ${events.length}`],
    [],
  ];
  if (summaryData && summaryData.length > 0) {
    headerRows.push(["Summary"]);
    headerRows.push(summaryData.map((s) => `${s.label}: ${s.value}`));
    headerRows.push([]);
  }

  /* Build data rows with headers */
  const dataRows = [headers, ...rows.map((r) => headers.map((h) => r[h]))];

  /* Footer */
  const footerRows = [
    [],
    [`Generated by EduGuard IoT System | ${now} | System Version: 6.0.0`],
  ];

  const allRows = [...headerRows, ...dataRows, ...footerRows];
  const ws = utils.aoa_to_sheet(allRows);

  /* Auto-width columns */
  ws["!cols"] = Array.from({ length: colCount }, (_, ci) => {
    const maxLen = Math.max(...allRows.map((r) => String(r[ci] || "").length));
    return { wch: Math.min(maxLen + 2, 45) };
  });

  /* Merge title row across all columns */
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } }];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "EduGuard Report");

  const writeFn = XLSX.write || XLSX.default?.write;
  const wbOut = writeFn(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbOut], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `${filename}.xlsx`);
}

async function exportPDF(events, filename, { summaryData, classroom } = {}) {
  const jspdfModule = await import("jspdf");
  const jsPDF =
    jspdfModule.jsPDF || jspdfModule.default?.jsPDF || jspdfModule.default;
  const autoTableModule = await import("jspdf-autotable");
  const autoTable = autoTableModule.default || autoTableModule.autoTable;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const now = new Date();
  const dateStr = now.toLocaleString("en-IN");
  const brandColor = [15, 118, 110]; // teal-700
  const lightGray = [107, 114, 128];

  /* ── Draw header on every page ── */
  function drawHeader() {
    /* Accent bar */
    doc.setFillColor(...brandColor);
    doc.rect(0, 0, pageW, 2, "F");

    /* Logo text */
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...brandColor);
    doc.text("EduGuard", margin, 14);
    const logoW = doc.getTextWidth("EduGuard");

    /* Subtitle — positioned after logo with comfortable gap */
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("IoT Classroom Monitoring System", margin + logoW + 4, 14);

    /* Report title */
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Event Report", margin, 23);

    /* Metadata line */
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...lightGray);
    const metaParts = [
      `Classroom: ${classroom || "—"}`,
      `Generated: ${dateStr}`,
      `Events: ${events.length}`,
    ];
    doc.text(metaParts.join("   \u2022   "), margin, 29);

    /* Separator */
    doc.setDrawColor(...brandColor);
    doc.setLineWidth(0.5);
    doc.line(margin, 32, pageW - margin, 32);
  }

  /* ── Draw footer on every page ── */
  function drawFooter(pageNum, totalPages) {
    const y = pageH - 8;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...lightGray);
    doc.text("Generated by EduGuard IoT System", margin, y);
    doc.text(dateStr, pageW / 2, y, { align: "center" });
    doc.text(
      `v6.0.0  \u2022  Page ${pageNum} of ${totalPages}`,
      pageW - margin,
      y,
      { align: "right" }
    );
    /* Bottom accent bar */
    doc.setFillColor(...brandColor);
    doc.rect(0, pageH - 2, pageW, 2, "F");
  }

  /* ── First page header ── */
  drawHeader();

  /* ── Summary section ── */
  let tableStartY = 36;
  if (summaryData && summaryData.length > 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("Summary", margin, 39);

    /* Summary boxes */
    const boxW = (pageW - 2 * margin) / summaryData.length;
    summaryData.forEach((s, i) => {
      const x = margin + i * boxW;
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(x + 1, 42, boxW - 2, 12, 1.5, 1.5, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...brandColor);
      doc.text(String(s.value), x + boxW / 2, 49, { align: "center" });
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...lightGray);
      doc.text(s.label, x + boxW / 2, 53, { align: "center" });
    });
    tableStartY = 58;
  }

  /* ── Data table ── */
  const rows = buildExportRows(events);
  const headers = Object.keys(rows[0] || {});
  autoTable(doc, {
    startY: tableStartY,
    head: [headers],
    body: rows.map((r) => headers.map((h) => r[h])),
    styles: {
      fontSize: 7,
      cellPadding: 2,
      lineColor: [229, 231, 235],
      lineWidth: 0.2,
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: brandColor,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 2.5,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: margin, right: margin, bottom: 16 },
    theme: "grid",
    didDrawPage: (data) => {
      /* Redraw header on continuation pages */
      if (data.pageNumber > 1) drawHeader();
    },
  });

  /* ── Add footers to all pages ── */
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

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
      ring: "ring-brand-500/20 dark:ring-brand-400/20",
    },
    red: {
      iconBg: "bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/25",
      ring: "ring-red-500/20 dark:ring-red-400/20",
    },
    amber: {
      iconBg:
        "bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/25",
      ring: "ring-amber-500/20 dark:ring-amber-400/20",
    },
    blue: {
      iconBg: "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/25",
      ring: "ring-blue-500/20 dark:ring-blue-400/20",
    },
    emerald: {
      iconBg:
        "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25",
      ring: "ring-emerald-500/20 dark:ring-emerald-400/20",
    },
    violet: {
      iconBg:
        "bg-gradient-to-br from-violet-500 to-violet-600 shadow-violet-500/25",
      ring: "ring-violet-500/20 dark:ring-violet-400/20",
    },
  };
  const pal = colors[color] || colors.brand;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-surface-200/60 bg-white/80 p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] backdrop-blur-xl ring-1 ring-inset transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:border-surface-700/50 dark:bg-surface-900/60 dark:shadow-[0_4px_20px_rgb(0,0,0,0.2)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] ${pal.ring}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-surface-400">
            {label}
          </p>
          <p className="text-3xl font-black tabular-nums tracking-tight text-surface-900 dark:text-white">
            {value}
          </p>
          {sub && (
            <p className="mt-1 text-[11px] font-medium text-surface-500 dark:text-surface-400">
              {sub}
            </p>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-inner ring-1 ring-inset ring-white/20 ${pal.iconBg}`}
        >
          <Icon size={20} className="text-white drop-shadow-sm" />
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
    <div className="rounded-2xl border border-surface-200/60 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-surface-700/50 dark:bg-surface-900/60 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      <div className="flex items-center gap-3 border-b border-surface-100/80 bg-surface-50/50 px-6 py-4 dark:border-surface-800/60 dark:bg-surface-800/20">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-inner ring-1 ring-inset ring-white/20">
          <Filter size={16} className="text-white drop-shadow-sm" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold tracking-tight text-surface-900 dark:text-white">
            Report Filters
          </h3>
          <p className="text-[11px] font-medium text-surface-500 dark:text-surface-400">
            {totalFiltered === totalAll
              ? `Showing all ${totalAll} events`
              : `${totalFiltered} of ${totalAll} events matching criteria`}
          </p>
        </div>
      </div>

      <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Report Type */}
        <div className="group">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-surface-500 group-focus-within:text-brand-600 transition-colors dark:group-focus-within:text-brand-400">
            Report Type
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full appearance-none rounded-xl border border-surface-200 bg-surface-50 px-4 py-2.5 text-[13px] font-bold text-surface-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:focus:border-brand-500 dark:focus:bg-surface-800"
          >
            {REPORT_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="group">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-surface-500 group-focus-within:text-brand-600 transition-colors dark:group-focus-within:text-brand-400">
            From Date
          </label>
          <div className="relative">
            <Calendar
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-brand-500 transition-colors"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-surface-200 bg-surface-50 py-2.5 pl-10 pr-4 text-[13px] font-bold text-surface-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:focus:border-brand-500 dark:focus:bg-surface-800"
            />
          </div>
        </div>

        {/* Date To */}
        <div className="group">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-surface-500 group-focus-within:text-brand-600 transition-colors dark:group-focus-within:text-brand-400">
            To Date
          </label>
          <div className="relative">
            <Calendar
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-brand-500 transition-colors"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-xl border border-surface-200 bg-surface-50 py-2.5 pl-10 pr-4 text-[13px] font-bold text-surface-900 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:focus:border-brand-500 dark:focus:bg-surface-800"
            />
          </div>
        </div>

        {/* Search */}
        <div className="group">
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-surface-500 group-focus-within:text-brand-600 transition-colors dark:group-focus-within:text-brand-400">
            Search Events
          </label>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400 group-focus-within:text-brand-500 transition-colors"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by event name…"
              className="w-full rounded-xl border border-surface-200 bg-surface-50 py-2.5 pl-10 pr-4 text-[13px] font-bold text-surface-900 outline-none transition-all placeholder:text-surface-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:placeholder:text-surface-500 dark:focus:border-brand-500 dark:focus:bg-surface-800"
            />
          </div>
        </div>
      </div>

      {/* Clear filters */}
      {(reportType !== "all" || dateFrom || dateTo || search) && (
        <div className="border-t border-surface-100/80 px-6 py-3.5 dark:border-surface-800/60">
          <button
            onClick={onClear}
            className="text-[12px] font-bold text-brand-600 transition-colors hover:text-brand-800 active:scale-95 dark:text-brand-400 dark:hover:text-brand-300"
          >
            ✕ Clear all active filters
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
    <div className="rounded-2xl border border-surface-200/60 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl overflow-hidden dark:border-surface-700/50 dark:bg-surface-900/60 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-100/80 px-6 py-4 bg-surface-50/50 dark:border-surface-800/60 dark:bg-surface-800/20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-inner ring-1 ring-inset ring-white/20">
            <BarChart3 size={16} className="text-white drop-shadow-sm" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold tracking-tight text-surface-900 dark:text-white">
              Event Log & History
            </h3>
            <p className="text-[11px] font-medium text-surface-500 dark:text-surface-400">
              {events.length} record{events.length !== 1 ? "s" : ""} · Page{" "}
              {safePage} of {totalPages}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-surface-400 dark:text-surface-500">
          <div className="rounded-full bg-surface-100 p-4 dark:bg-surface-800">
            <Clock className="animate-pulse" size={32} />
          </div>
          <p className="text-[15px] font-bold text-surface-900 dark:text-white">
            No matching events
          </p>
          <p className="text-[13px] font-medium text-surface-500">
            Try adjusting your filters or date range.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-surface-200/60 bg-surface-50/50 dark:border-surface-800/60 dark:bg-surface-800/40">
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-surface-500 dark:text-surface-400">
                    #
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-surface-500 dark:text-surface-400">
                    Event
                  </th>
                  <th className="hidden px-6 py-4 text-[11px] font-black uppercase tracking-wider text-surface-500 sm:table-cell dark:text-surface-400">
                    Category
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-surface-500 dark:text-surface-400">
                    Severity
                  </th>
                  <th className="hidden px-6 py-4 text-[11px] font-black uppercase tracking-wider text-surface-500 lg:table-cell dark:text-surface-400">
                    Details
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-wider text-surface-500 dark:text-surface-400">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100/80 dark:divide-surface-800/60">
                {pageEvents.map((ev, i) => {
                  const def = EVENT_DEFS[ev.type] || EVENT_DEFS.periodChange;
                  const EvIcon = def.icon;
                  const sevStyle =
                    SEVERITY_STYLES[def.severity] || SEVERITY_STYLES.info;

                  return (
                    <tr
                      key={ev.id}
                      className="group transition-colors hover:bg-surface-50/80 dark:hover:bg-surface-800/30"
                    >
                      <td className="px-6 py-4 text-[13px] font-bold tabular-nums text-surface-400 dark:text-surface-500">
                        {startIdx + i + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${sevStyle.bg}`}
                          >
                            <EvIcon size={16} className={sevStyle.text} />
                          </div>
                          <span className="text-[14px] font-bold text-surface-900 dark:text-white">
                            {def.label}
                          </span>
                        </div>
                      </td>
                      <td className="hidden px-6 py-4 sm:table-cell">
                        <span className="rounded-lg bg-surface-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-surface-600 dark:bg-surface-800 dark:text-surface-400">
                          {def.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset ${sevStyle.badge}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${sevStyle.dot}`}
                          />
                          {def.severity}
                        </span>
                      </td>
                      <td className="hidden max-w-[220px] truncate px-6 py-4 text-[13px] font-medium text-surface-600 dark:text-surface-300 lg:table-cell">
                        {ev.detail || metaToString(ev.meta) || "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-[13px] font-bold tabular-nums text-surface-800 dark:text-surface-200">
                          {formatTime(ev.ts)}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-surface-500 dark:text-surface-400">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-surface-100/80 bg-surface-50/30 px-6 py-4 dark:border-surface-800/60 dark:bg-surface-800/20">
            <p className="text-[12px] font-semibold text-surface-500 dark:text-surface-400">
              Showing{" "}
              <span className="text-surface-900 dark:text-white">
                {startIdx + 1}
              </span>{" "}
              to{" "}
              <span className="text-surface-900 dark:text-white">
                {Math.min(startIdx + ROWS_PER_PAGE, events.length)}
              </span>{" "}
              of{" "}
              <span className="text-surface-900 dark:text-white">
                {events.length}
              </span>{" "}
              results
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 text-surface-600 transition-all hover:bg-surface-100 active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              {pageButtons.map((pg, i) =>
                pg === "..." ? (
                  <span
                    key={`dots-${i}`}
                    className="px-2 text-[13px] font-bold text-surface-400"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl text-[13px] font-bold transition-all active:scale-95 ${
                      pg === safePage
                        ? "bg-surface-900 text-white shadow-md dark:bg-white dark:text-surface-900"
                        : "border border-surface-200 text-surface-700 hover:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
                    }`}
                  >
                    {pg}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 text-surface-600 transition-all hover:bg-surface-100 active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Export Panel ── */
function ExportPanel({ events, summaryData, disabled, classroom }) {
  const [exporting, setExporting] = useState(null);
  const filename = `EduGuard_Report_${toISODate(Date.now())}`;
  const exportMeta = { classroom, summaryData };

  const handleExport = async (format) => {
    if (events.length === 0) return;
    setExporting(format);
    try {
      switch (format) {
        case "xlsx":
          await exportExcel(events, filename, exportMeta);
          break;
        case "pdf":
          await exportPDF(events, filename, exportMeta);
          break;
        case "csv":
          exportCSV(events, filename, exportMeta);
          break;
        case "json":
          exportJSON(events, filename, exportMeta);
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
      desc: "Formatted spreadsheet with columns",
      icon: FileSpreadsheet,
      primary: true,
      color:
        "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25 ring-emerald-500/50 hover:shadow-emerald-500/40 focus-visible:ring-emerald-400",
    },
    {
      key: "pdf",
      label: "PDF Report",
      desc: "Professional report with summary",
      icon: FileText,
      color:
        "bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/25 ring-red-500/50 hover:shadow-red-500/40 focus-visible:ring-red-400",
    },
    {
      key: "csv",
      label: "CSV Export",
      desc: "Raw comma-separated data",
      icon: ArrowDownToLine,
      color:
        "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/25 ring-blue-500/50 hover:shadow-blue-500/40 focus-visible:ring-blue-400",
    },
    {
      key: "json",
      label: "JSON API",
      desc: "Structured data for developers",
      icon: FileJson,
      color:
        "bg-gradient-to-br from-violet-500 to-violet-600 shadow-violet-500/25 ring-violet-500/50 hover:shadow-violet-500/40 focus-visible:ring-violet-400",
    },
  ];

  return (
    <div className="rounded-2xl border border-surface-200/60 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl dark:border-surface-700/50 dark:bg-surface-900/60 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-surface-100/80 px-6 py-4 bg-surface-50/50 dark:border-surface-800/60 dark:bg-surface-800/20">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-surface-700 to-surface-900 shadow-inner ring-1 ring-inset ring-white/20 dark:from-surface-600 dark:to-surface-800">
          <Download size={16} className="text-white drop-shadow-sm" />
        </div>
        <div>
          <h3 className="text-[14px] font-bold tracking-tight text-surface-900 dark:text-white">
            Export & Download
          </h3>
          <p className="text-[11px] font-medium text-surface-500 dark:text-surface-400">
            {disabled
              ? "No events available to export"
              : `${events.length} event${events.length !== 1 ? "s" : ""} ready for export formatting`}
          </p>
        </div>
      </div>

      {/* Format buttons */}
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
        {formats.map(({ key, label, desc, icon: FmtIcon, primary, color }) => (
          <button
            key={key}
            onClick={() => handleExport(key)}
            disabled={disabled || exporting !== null}
            className={`group relative flex flex-col items-start gap-3 rounded-2xl px-5 py-5 text-left text-white shadow-lg ring-1 ring-inset transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none hover:-translate-y-0.5 ${color}`}
          >
            {primary && (
              <span className="absolute right-4 top-4 rounded-lg bg-white/25 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest backdrop-blur-md">
                Recommended
              </span>
            )}
            <div className="flex items-center gap-2">
              {exporting === key ? (
                <Activity
                  className="animate-spin text-white drop-shadow-md"
                  size={20}
                />
              ) : (
                <FmtIcon
                  size={20}
                  className="text-white drop-shadow-md"
                  strokeWidth={2.5}
                />
              )}
            </div>
            <div>
              <span className="block text-[15px] font-bold tracking-tight">
                {label}
              </span>
              <span className="mt-0.5 block text-[12px] font-medium opacity-80">
                {desc}
              </span>
            </div>
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
  const { events: liveEvents, wsStatus, configParsed } = useTelemetry();
  const classroom = configParsed?.classroom || "—";

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

  /* ── Reset report data ── */
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleResetData = useCallback(async () => {
    setResetting(true);
    try {
      const token =
        localStorage.getItem("eduguard_access_token") ||
        sessionStorage.getItem("eduguard_access_token");
      const res = await fetch(`${API_BASE}/api/v1/events`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDbEvents([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setResetting(false);
    }
  }, [API_BASE]);

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
    <AnimatedPage className="pb-16 max-w-[1400px] mx-auto space-y-8">
      {/* ═══ Breadcrumb & Title ═══ */}
      <div className="border-b border-surface-200/60 pb-6 dark:border-surface-800/60">
        <div className="flex items-center gap-2 text-[12px] font-bold text-surface-400 mb-4 uppercase tracking-wider">
          <Link
            to="/dashboard"
            className="hover:text-brand-500 transition-colors"
          >
            Dashboard
          </Link>
          <ChevronRight size={14} strokeWidth={3} />
          <span className="text-surface-700 dark:text-surface-200">
            Reports
          </span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-surface-900 dark:text-white">
              Reports & Analytics
            </h1>
            <p className="mt-2 text-[15px] font-medium text-surface-500 dark:text-surface-400">
              Persistent event history, analytics summaries, and multi-format
              data export.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowResetModal(true)}
              disabled={resetting || allEvents.length === 0}
              title="Reset all report data"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-500 shadow-sm transition-all hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-40 disabled:shadow-none dark:border-red-900/30 dark:bg-surface-900 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              {resetting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Trash2 size={18} strokeWidth={2.5} />
              )}
            </button>
            <button
              onClick={fetchEvents}
              disabled={loading}
              title="Refresh events from database"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-200 bg-white text-surface-600 shadow-sm transition-all hover:bg-surface-50 hover:text-brand-600 active:scale-95 disabled:opacity-40 disabled:shadow-none dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:text-brand-400"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RefreshCw size={18} strokeWidth={2.5} />
              )}
            </button>
            <div className="h-6 w-px bg-surface-200 dark:bg-surface-700 hidden sm:block mx-1" />
            <span className="flex items-center gap-2 rounded-xl bg-brand-50 px-4 py-2 text-[12px] font-bold tracking-wide text-brand-700 ring-1 ring-inset ring-brand-200/60 dark:bg-brand-500/10 dark:text-brand-400 dark:ring-brand-900/30">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              {allEvents.length} Total Events
            </span>
            <span
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold tracking-wide ring-1 ring-inset ${
                wsStatus === "connected"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-900/30"
                  : "bg-red-50 text-red-700 ring-red-200/60 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-900/30"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  wsStatus === "connected"
                    ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                    : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                }`}
              />
              {wsStatus === "connected" ? "System Live" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Error Banner ═══ */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200/80 bg-gradient-to-r from-red-50 to-white px-6 py-4 shadow-sm dark:border-red-900/40 dark:from-red-950/30 dark:to-surface-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
            <XCircle size={20} className="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-red-900 dark:text-red-300">
              Failed to load database events
            </p>
            <p className="text-[13px] font-medium text-red-700/80 dark:text-red-400/80">
              {error}
            </p>
          </div>
          <button
            onClick={fetchEvents}
            className="ml-auto rounded-xl bg-white px-4 py-2 text-[13px] font-bold text-red-700 shadow-sm ring-1 ring-inset ring-red-200 transition-all hover:bg-red-50 active:scale-95 dark:bg-surface-800 dark:text-red-400 dark:ring-red-800/60 dark:hover:bg-surface-700"
          >
            Retry Connection
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
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-5">
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
        classroom={classroom}
      />

      {/* ═══ Reset Data Modal ═══ */}
      <PasswordConfirmModal
        open={showResetModal}
        title="Reset Report Data"
        description="All event history will be permanently deleted. This cannot be undone."
        confirmLabel="Reset All Data"
        variant="danger"
        onConfirm={handleResetData}
        onCancel={() => setShowResetModal(false)}
      />
    </AnimatedPage>
  );
}
