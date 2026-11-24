/** Shared API contracts used by both the mock API and the real backend. */
export type SortOrder = "asc" | "desc";

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  [filter: string]: string | number | boolean | undefined;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Normalized error shape produced by the shared base query. */
export interface ApiError {
  status: number | "FETCH_ERROR" | "PARSING_ERROR" | "TIMEOUT_ERROR" | "CUSTOM_ERROR";
  message: string;
  /** Field-level validation errors, e.g. { email: ["Email is already in use"] }. */
  errors?: Record<string, string[]>;
}

export interface MessageResponse {
  message: string;
}

export interface Option<V extends string | number = string> {
  label: string;
  value: V;
}
