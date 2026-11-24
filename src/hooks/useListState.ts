"use client";

import { useCallback, useMemo, useState } from "react";
import { appConfig } from "@/config/app.config";
import type { ListParams, SortOrder } from "@/types/api";
import { useDebounce } from "./useDebounce";

export interface ListStateOptions {
  pageSize?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  filters?: Record<string, string>;
}

/**
 * Local state for list pages: search (debounced), filters, sorting and pagination.
 * Produces a stable `params` object that becomes the RTK Query cache key.
 */
export function useListState(options: ListStateOptions = {}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(options.pageSize ?? appConfig.defaultPageSize);
  const [search, setSearchState] = useState("");
  const [sortBy, setSortBy] = useState(options.sortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(options.sortOrder ?? "asc");
  const [filters, setFilters] = useState<Record<string, string>>(options.filters ?? {});
  const debouncedSearch = useDebounce(search);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPage(1);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(options.filters ?? {});
    setSearchState("");
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSort = useCallback(
    (key: string) => {
      if (sortBy === key) {
        setSortOrder((order) => (order === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(key);
        setSortOrder("asc");
      }
      setPage(1);
    },
    [sortBy],
  );

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const params: ListParams = useMemo(
    () => ({ page, pageSize, search: debouncedSearch || undefined, sortBy, sortOrder, ...filters }),
    [page, pageSize, debouncedSearch, sortBy, sortOrder, filters],
  );

  const hasActiveFilters = Boolean(search) || Object.entries(filters).some(([key, value]) => value && value !== (options.filters ?? {})[key]);

  return {
    params,
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    filters,
    setPage,
    setPageSize,
    setSearch,
    setFilter,
    resetFilters,
    toggleSort,
    hasActiveFilters,
  };
}
