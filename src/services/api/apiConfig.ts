export type ApiMode = "mock" | "real";

function readMode(): ApiMode {
  const value = process.env.NEXT_PUBLIC_API_MODE;
  return value === "real" ? "real" : "mock";
}

/** Centralized API configuration, read from public (non-secret) environment variables. */
export const apiConfig = {
  mode: readMode(),
  baseUrl: (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/$/, ""),
  mockDelayMs: Number(process.env.NEXT_PUBLIC_MOCK_DELAY_MS ?? 400),
  timeoutMs: 20000,
} as const;
