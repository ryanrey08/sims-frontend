"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { appConfig } from "@/config/app.config";
import { cn } from "@/lib/utils/cn";
import type { PaginationMeta } from "@/types/api";

/** Page numbers with ellipses, e.g. 1 2 3 4 5 … 12. */
function pageList(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, page - 1, page, page + 1, ...(page <= 4 ? [2, 3, 4, 5] : []), ...(page >= total - 3 ? [total - 4, total - 3, total - 2, total - 1] : [])]);
  const sorted = [...pages].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b);
  return sorted.flatMap((value, index) => (index > 0 && value - sorted[index - 1] > 1 ? ["…" as const, value] : [value]));
}

const square = "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-line bg-white px-2 text-sm text-ink transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40";

/** Mockup pagination: "Showing 1 to 10 of N records" · « ‹ 1 2 3 › » · "10 / page". */
export function Pagination({
  meta,
  onPageChange,
  onPageSizeChange,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const { page, pageSize, total, totalPages } = meta;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row">
      <p className="text-[13px] text-slate-600">
        Showing {from} to {to} of {total.toLocaleString("en-PH")} records
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" className={square} onClick={() => onPageChange(1)} disabled={page <= 1} aria-label="First page">
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button type="button" className={square} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageList(page, totalPages).map((value, index) =>
          value === "…" ? (
            <span key={`gap-${index}`} className="px-1 text-sm text-muted">…</span>
          ) : (
            <button
              key={value}
              type="button"
              onClick={() => onPageChange(value)}
              aria-current={value === page ? "page" : undefined}
              className={cn(square, value === page && "border-brand-600 bg-brand-600 font-semibold text-white hover:bg-brand-600")}
            >
              {value}
            </button>
          ),
        )}
        <button type="button" className={square} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
        <button type="button" className={square} onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} aria-label="Last page">
          <ChevronsRight className="h-4 w-4" />
        </button>
        {onPageSizeChange && (
          <label className="ml-2">
            <span className="sr-only">Rows per page</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-8 rounded-md border border-line bg-white px-2 text-sm text-ink"
            >
              {appConfig.pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </nav>
  );
}
