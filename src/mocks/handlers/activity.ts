import { getDb, newId, nowISO } from "../database/db";
import type { MockRequest } from "./utils";

/** Records an entry in the activity feed shown on the dashboard. */
export function logActivityEntry(request: MockRequest, action: string, target: string, module: string) {
  const db = getDb();
  const actor = db.users.find((user) => user.id === request.userId)?.name ?? "System";
  db.activities.unshift({ id: newId("activity"), actor, action, target, module, createdAt: nowISO() });
  db.activities = db.activities.slice(0, 50);
}
