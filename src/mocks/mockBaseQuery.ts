import type { BaseQueryFn, FetchArgs } from "@reduxjs/toolkit/query";
import { apiConfig } from "@/services/api/apiConfig";
import type { AuthState } from "@/store/features/authSlice";
import { sessionExpired } from "@/store/features/authSlice";
import type { ApiError } from "@/types/api";
import { getDb } from "./database/db";
import { matchRoute } from "./handlers";
import { MockHttpError } from "./handlers/utils";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function toQuery(params: unknown): Record<string, string> {
  if (!params || typeof params !== "object") return {};
  return Object.fromEntries(
    Object.entries(params as Record<string, unknown>)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => [key, String(value)]),
  );
}

/**
 * An RTK Query base query that serves requests from the in-browser mock database.
 * It accepts the exact same `{ url, method, params, body }` args as fetchBaseQuery,
 * so endpoint definitions are identical in mock and real modes.
 */
export const mockBaseQuery: BaseQueryFn<string | FetchArgs, unknown, ApiError> = async (args, api) => {
  const request = typeof args === "string" ? { url: args } : args;
  const method = (request.method ?? "GET").toUpperCase();
  const [path, inlineQuery] = request.url.split("?");
  const query = { ...Object.fromEntries(new URLSearchParams(inlineQuery ?? "")), ...toQuery(request.params) };

  // Mutations take slightly longer, like a real server.
  await wait(apiConfig.mockDelayMs * (method === "GET" ? 1 : 1.5));

  const matched = matchRoute(method, path);
  if (!matched) {
    return { error: { status: 404, message: `Mock API: no handler for ${method} ${path}` } };
  }

  const token = (api.getState() as { auth: AuthState }).auth.token;
  const db = getDb();
  const userId = token ? (db.sessions[token] ?? null) : null;

  if (!matched.route.public && !userId) {
    api.dispatch(sessionExpired());
    return { error: { status: 401, message: "Your session has expired. Please sign in again." } };
  }

  try {
    const data = matched.route.handler({
      method,
      path,
      params: matched.params,
      query,
      body: request.body,
      userId,
    });
    // Return a deep copy so cached data is never the same object as the mock DB record.
    return { data: data === undefined ? null : structuredClone(data) };
  } catch (error) {
    if (error instanceof MockHttpError) {
      return { error: { status: error.status, message: error.message, errors: error.errors } };
    }
    console.error("[mock api]", error);
    return { error: { status: 500, message: "Mock API: unexpected error." } };
  }
};
