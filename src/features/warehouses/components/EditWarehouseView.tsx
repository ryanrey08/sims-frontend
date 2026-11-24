"use client";

import { QueryBoundary } from "@/components/common/QueryBoundary";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useGetWarehouseQuery } from "@/services/api/endpoints/warehousesApi";
import { WarehouseForm } from "./WarehouseForm";

export function EditWarehouseView({ id }: { id: string }) {
  const query = useGetWarehouseQuery(id);
  useBreadcrumbLabel(id, query.data?.name);
  return <QueryBoundary {...query}>{(warehouse) => <WarehouseForm warehouse={warehouse} />}</QueryBoundary>;
}
