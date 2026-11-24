"use client";

import { Warehouse } from "lucide-react";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermission";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useGetWarehousesQuery } from "@/services/api/endpoints/warehousesApi";
import { selectWarehouseId, warehouseSelected } from "@/store/features/appContextSlice";

/** Global warehouse selector; stock and dashboard views read it from Redux as a shared filter. */
export function ContextSwitcher() {
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const warehouseId = useAppSelector(selectWarehouseId);
  const allowed = can(PERMISSIONS.warehousesView);
  const { data } = useGetWarehousesQuery({ status: "active", pageSize: 100 }, { skip: !allowed });
  if (!allowed) return null;
  return (
    <label className="hidden items-center gap-2 rounded-lg border border-line bg-white px-2.5 text-sm sm:flex">
      <Warehouse className="h-4 w-4 text-brand-700" aria-hidden />
      <span className="sr-only">Warehouse</span>
      <select
        value={warehouseId}
        onChange={(event) => dispatch(warehouseSelected(event.target.value))}
        className="h-9 max-w-48 bg-transparent pr-1 text-sm font-medium text-ink focus:outline-none"
      >
        <option value="">All warehouses</option>
        {data?.data.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>
            {warehouse.name}
          </option>
        ))}
      </select>
    </label>
  );
}
