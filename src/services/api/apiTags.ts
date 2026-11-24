/** Cache tag types. Each module provides/invalidates its own tags. */
export const API_TAGS = [
  "Auth",
  "Dashboard",
  "Product",
  "Category",
  "Supplier",
  "Warehouse",
  "Stock",
  "Movement",
  "PurchaseOrder",
  "Requisition",
  "User",
  "Role",
  "Settings",
  "Notification",
  "Activity",
  "Report",
] as const;

export type ApiTag = (typeof API_TAGS)[number];

/** Sentinel id for the collection-level ("LIST") tag of a type. */
export const LIST_ID = "LIST";

/** Builds entity tags plus a collection tag for a paginated/list response. */
export function provideListTags<T extends { id: string }, Tag extends ApiTag>(
  type: Tag,
  items: T[] | undefined,
) {
  return [...(items ?? []).map(({ id }) => ({ type, id }) as const), { type, id: LIST_ID } as const];
}
