"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { appConfig } from "@/config/app.config";
import { Button } from "@/components/ui/Button";
import type { PaginationMeta } from "@/types/api";

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
    <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 border-t border-line px-4 py-3 sm:flex-row">
      <p className="text-sm text-muted">
        Showing <span className="font-medium text-ink">{from}</span>–<span className="font-medium text-ink">{to}</span> of{" "}
        <span className="font-medium text-ink">{total}</span>
      </p>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-sm text-muted">
            Rows
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-8 rounded-md border border-line bg-white px-2 text-sm text-ink"
            >
              {appConfig.pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-20 text-center text-sm text-ink" aria-current="page">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="icon" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
