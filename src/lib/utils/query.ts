import type { ListParams } from "@/types/api";

/** Removes empty values so they are not serialized into the query string. */
export function cleanParams<T extends object>(params: T | undefined): Partial<T> {
  if (!params) return {};
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ) as Partial<T>;
}

/** Serializes params into a stable query string (sorted keys keep cache keys deterministic). */
export function toQueryString(params: ListParams | Record<string, unknown> | undefined) {
  const cleaned = cleanParams(params) as Record<string, unknown>;
  const search = new URLSearchParams();
  Object.keys(cleaned)
    .sort()
    .forEach((key) => search.append(key, String(cleaned[key])));
  return search.toString();
}
