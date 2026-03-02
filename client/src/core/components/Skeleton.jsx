/**
 * Skeleton
 * --------
 * Premium shimmer-based loading skeleton components.
 * Used to show content placeholders while data loads.
 */

/** Base shimmer skeleton block */
export function Skeleton({ className = "", rounded = "rounded-lg" }) {
  return (
    <div
      className={`animate-pulse bg-surface-200/60 dark:bg-surface-700/40 ${rounded} ${className}`}
    />
  );
}

/** Skeleton that looks like a stat card */
export function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-surface-200/60 bg-white p-6 shadow-card dark:border-surface-800 dark:bg-surface-900 ${className}`}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 shrink-0" rounded="rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-14" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton row for tables */
export function SkeletonRow({ cols = 4, className = "" }) {
  return (
    <tr className={className}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

/** Skeleton table with multiple rows */
export function SkeletonTable({ rows = 5, cols = 4, className = "" }) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-card dark:border-surface-800 dark:bg-surface-900 ${className}`}
    >
      {/* Header */}
      <div className="border-b border-surface-100 bg-surface-50/80 px-6 py-4 dark:border-surface-800 dark:bg-surface-800/50">
        <div className="flex gap-8">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" rounded="rounded" />
          ))}
        </div>
      </div>
      {/* Rows */}
      <table className="w-full">
        <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Full page skeleton with stat cards + table */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      {/* Table */}
      <SkeletonTable />
    </div>
  );
}
