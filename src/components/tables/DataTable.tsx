"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { EmptyState, ErrorState } from "@/components/common/States";
import { Pagination } from "@/components/common/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils/cn";
import type { PaginationMeta, SortOrder } from "@/types/api";

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  /** Enables header sorting using this key (defaults to `key`). */
  sortable?: boolean;
  sortKey?: string;
  className?: string;
  /** Hidden on the mobile card layout. */
  hideOnMobile?: boolean;
  align?: "left" | "right" | "center";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  caption: string;
  loading?: boolean;
  fetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSort?: (key: string) => void;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Column shown as the card title on mobile (defaults to the first column). */
  mobileTitleKey?: string;
}

/** Sortable, paginated table that turns into stacked cards on small screens. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  loading,
  fetching,
  error,
  onRetry,
  sortBy,
  sortOrder,
  onSort,
  meta,
  onPageChange,
  onPageSizeChange,
  empty,
  onRowClick,
  mobileTitleKey,
}: DataTableProps<T>) {
  if (error && !rows) return <ErrorState error={error} onRetry={onRetry} />;

  const titleColumn = columns.find((column) => column.key === mobileTitleKey) ?? columns[0];
  const alignClass = (align?: Column<T>["align"]) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  const sortIcon = (column: Column<T>) => {
    const key = column.sortKey ?? column.key;
    if (sortBy !== key) return <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />;
    return sortOrder === "desc" ? <ChevronDown className="h-3.5 w-3.5 text-brand-600" aria-hidden /> : <ChevronUp className="h-3.5 w-3.5 text-brand-600" aria-hidden />;
  };

  const showSkeleton = loading && !rows;
  const isEmpty = !showSkeleton && rows && rows.length === 0;

  return (
    <div className={cn("transition-opacity", fetching && !loading && "opacity-60")} aria-busy={loading || fetching}>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-y border-line bg-[#f3f4f6]">
              {columns.map((column) => {
                const key = column.sortKey ?? column.key;
                const ariaSort = sortBy === key ? (sortOrder === "desc" ? "descending" : "ascending") : undefined;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={column.sortable ? (ariaSort ?? "none") : undefined}
                    className={cn("whitespace-nowrap px-3 py-2.5 text-[12px] font-bold text-ink", alignClass(column.align), column.className)}
                  >
                    {column.sortable && onSort ? (
                      <button type="button" onClick={() => onSort(key)} className="inline-flex items-center gap-1 hover:text-brand-600">
                        {column.header}
                        {sortIcon(column)}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {showSkeleton &&
              Array.from({ length: 6 }, (_, index) => (
                <tr key={index} className="border-b border-line last:border-0">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3.5">
                      <Skeleton className="h-4 w-full max-w-36" />
                    </td>
                  ))}
                </tr>
              ))}
            {rows?.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn("border-b border-line last:border-0", onRowClick && "cursor-pointer hover:bg-slate-50")}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-3 py-2.5 text-[13px] text-ink", alignClass(column.align), column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-line md:hidden" aria-label={caption}>
        {showSkeleton &&
          Array.from({ length: 4 }, (_, index) => (
            <li key={index} className="space-y-2 p-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </li>
          ))}
        {rows?.map((row) => (
          <li key={rowKey(row)} className={cn("p-4", onRowClick && "cursor-pointer active:bg-slate-50")} onClick={onRowClick ? () => onRowClick(row) : undefined}>
            <div className="mb-2 font-medium text-ink">{titleColumn.cell(row)}</div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {columns
                .filter((column) => column !== titleColumn && !column.hideOnMobile)
                .map((column) => (
                  <div key={column.key} className="min-w-0">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{column.header}</dt>
                    <dd className="mt-0.5 text-sm text-ink">{column.cell(row)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>

      {isEmpty && (empty ?? <EmptyState title="No records found" description="Try adjusting your search or filters." />)}
      {meta && onPageChange && rows && rows.length > 0 && (
        <Pagination meta={meta} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
      )}
    </div>
  );
}
