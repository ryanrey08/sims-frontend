"use client";

import { useGetAvailabilityQuery } from "@/services/api/endpoints/inventoryApi";

/** Shows the quantity on hand for a product in a warehouse (conditional fetch). */
export function AvailabilityHint({ productId, warehouseId, unit }: { productId: string; warehouseId: string; unit?: string }) {
  const { data, isFetching } = useGetAvailabilityQuery({ productId, warehouseId }, { skip: !productId || !warehouseId });
  if (!productId || !warehouseId) return null;
  return (
    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-muted" aria-live="polite">
      On hand: <span className="font-semibold text-ink">{isFetching && !data ? "…" : (data?.quantity ?? 0)}</span> {unit}
    </p>
  );
}
