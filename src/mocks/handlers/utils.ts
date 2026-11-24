import type { Permission } from "@/constants/permissions";
import type { Paginated, SortOrder } from "@/types/api";
import { getDb } from "../database/db";

export class MockHttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export interface MockRequest {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  userId: string | null;
}

export interface MockRoute {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  pattern: string;
  handler: (request: MockRequest) => unknown;
  /** Public routes do not require a session token. */
  public?: boolean;
}

export function notFound(label = "Record"): never {
  throw new MockHttpError(404, `${label} not found.`);
}

export function conflict(message: string): never {
  throw new MockHttpError(409, message);
}

export function validationFailed(errors: Record<string, string[]>): never {
  throw new MockHttpError(422, "Please correct the highlighted fields.", errors);
}

export function bodyOf<T>(request: MockRequest): T {
  return (request.body ?? {}) as T;
}

/** Throws a 422 listing required fields that are empty. */
export function requireFields(body: Record<string, unknown>, fields: string[]) {
  const errors: Record<string, string[]> = {};
  for (const field of fields) {
    const value = body[field];
    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
      errors[field] = ["This field is required."];
    }
  }
  if (Object.keys(errors).length) validationFailed(errors);
}

/** Throws a 422 when another record already uses the value. */
export function assertUnique<T extends { id: string }>(
  items: T[],
  field: keyof T,
  value: unknown,
  excludeId: string | undefined,
  message: string,
) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : value;
  const clash = items.some((item) => {
    const current = item[field];
    const comparable = typeof current === "string" ? current.trim().toLowerCase() : current;
    return item.id !== excludeId && comparable === normalized;
  });
  if (clash) validationFailed({ [field as string]: [message] });
}

/** 403 unless the requesting user's role grants the permission. */
export function requirePermission(request: MockRequest, permission: Permission) {
  const db = getDb();
  const user = db.users.find((item) => item.id === request.userId);
  const role = db.roles.find((item) => item.id === user?.roleId);
  if (!role?.permissions.includes(permission)) {
    throw new MockHttpError(403, "You do not have permission to perform this action.");
  }
}

export function matchesSearch(search: string | undefined, values: (string | undefined | null)[]) {
  if (!search) return true;
  const needle = search.trim().toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(needle));
}

/** Applies exact-match filters for the given query keys. */
export function applyFilters<T>(items: T[], query: Record<string, string>, keys: (keyof T & string)[]) {
  return items.filter((item) =>
    keys.every((key) => {
      const expected = query[key];
      if (expected === undefined || expected === "" || expected === "all") return true;
      return String(item[key]) === expected;
    }),
  );
}

export function sortItems<T>(items: T[], sortBy: string | undefined, sortOrder: SortOrder | string | undefined) {
  if (!sortBy) return items;
  const direction = sortOrder === "desc" ? -1 : 1;
  return [...items].sort((a, b) => {
    const left = (a as Record<string, unknown>)[sortBy];
    const right = (b as Record<string, unknown>)[sortBy];
    if (left === right) return 0;
    if (left === undefined || left === null) return 1;
    if (right === undefined || right === null) return -1;
    if (typeof left === "number" && typeof right === "number") return (left - right) * direction;
    return String(left).localeCompare(String(right), undefined, { numeric: true }) * direction;
  });
}

export function paginate<T>(items: T[], query: Record<string, string>): Paginated<T> {
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 10, 1), 200);
  const total = items.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = Math.min(Math.max(Number(query.page) || 1, 1), totalPages);
  const start = (page - 1) * pageSize;
  return { data: items.slice(start, start + pageSize), meta: { page, pageSize, total, totalPages } };
}

/** Search → sort → paginate in one call. */
export function listResponse<T>(items: T[], query: Record<string, string>) {
  return paginate(sortItems(items, query.sortBy, query.sortOrder), query);
}

export function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
