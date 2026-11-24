/** Chart series colours, aligned with the brand tokens in globals.css. */
export const CHART_COLORS = ["#1e3a8a", "#f59e0b", "#0ea5e9", "#10b981", "#ef4444", "#8b5cf6", "#64748b"];

/** Fixed colours for series and slices whose meaning is a status. */
export const STATUS_COLORS: Record<string, string> = {
  inbound: "#10b981",
  outbound: "#ef4444",
  "In stock": "#10b981",
  "Low stock": "#f59e0b",
  "Out of stock": "#ef4444",
  Receipt: "#10b981",
  Issue: "#f59e0b",
  "Adjustment +": "#0ea5e9",
  "Adjustment −": "#ef4444",
  "Transfer in": "#1e3a8a",
  "Transfer out": "#64748b",
};
