import { fetchBaseQuery, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import type { ApiError } from "@/types/api";
import { toQueryString } from "@/lib/utils/query";
import { sessionExpired, type AuthState } from "@/store/features/authSlice";
import { apiConfig } from "./apiConfig";

export type AppBaseQuery = BaseQueryFn<string | FetchArgs, unknown, ApiError>;

const rawRealBaseQuery = fetchBaseQuery({
  baseUrl: apiConfig.baseUrl,
  timeout: apiConfig.timeoutMs,
  paramsSerializer: (params) => toQueryString(params),
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: AuthState }).auth.token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/json");
    return headers;
  },
});

/** Converts any fetchBaseQuery error into the app-wide ApiError shape. */
export function normalizeError(error: FetchBaseQueryError): ApiError {
  if (typeof error.status === "number") {
    const data = (error.data ?? {}) as { message?: string; errors?: Record<string, string[] | string> };
    const errors = data.errors
      ? Object.fromEntries(
          Object.entries(data.errors).map(([field, value]) => [field, Array.isArray(value) ? value : [value]]),
        )
      : undefined;
    const fallback =
      error.status === 401
        ? "Your session has expired. Please sign in again."
        : error.status === 403
          ? "You do not have permission to perform this action."
          : error.status === 404
            ? "The requested record was not found."
            : error.status >= 500
              ? "The server encountered an error. Please try again later."
              : "The request could not be completed.";
    return { status: error.status, message: data.message ?? fallback, errors };
  }
  if (error.status === "FETCH_ERROR") {
    return { status: error.status, message: "Unable to reach the server. Check your connection or API URL." };
  }
  if (error.status === "TIMEOUT_ERROR") {
    return { status: error.status, message: "The server took too long to respond." };
  }
  if (error.status === "PARSING_ERROR") {
    return { status: error.status, message: "The server returned an unexpected response." };
  }
  return { status: "CUSTOM_ERROR", message: error.error };
}

/** Real backend: fetchBaseQuery + auth header + normalized errors + 401 handling. */
const realBaseQuery: AppBaseQuery = async (args, api, extraOptions) => {
  const result = await rawRealBaseQuery(args, api, extraOptions);
  if (result.error) {
    const error = normalizeError(result.error);
    if (error.status === 401) api.dispatch(sessionExpired());
    return { error, meta: result.meta };
  }
  return { data: result.data, meta: result.meta };
};

/**
 * Mock backend: same request contract, served from an in-browser database.
 * Loaded lazily so the mock code is split out of the main bundle.
 */
const mockBaseQuery: AppBaseQuery = async (args, api, extraOptions) => {
  const { mockBaseQuery: handler } = await import("@/mocks/mockBaseQuery");
  return handler(args, api, extraOptions);
};

/** The single base query used by the shared API slice. Selected by NEXT_PUBLIC_API_MODE. */
export const appBaseQuery: AppBaseQuery = apiConfig.mode === "mock" ? mockBaseQuery : realBaseQuery;
