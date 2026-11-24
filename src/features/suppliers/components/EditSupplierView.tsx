"use client";

import { QueryBoundary } from "@/components/common/QueryBoundary";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useGetSupplierQuery } from "@/services/api/endpoints/suppliersApi";
import { SupplierForm } from "./SupplierForm";

export function EditSupplierView({ id }: { id: string }) {
  const query = useGetSupplierQuery(id);
  useBreadcrumbLabel(id, query.data?.name);
  return <QueryBoundary {...query}>{(supplier) => <SupplierForm supplier={supplier} />}</QueryBoundary>;
}
