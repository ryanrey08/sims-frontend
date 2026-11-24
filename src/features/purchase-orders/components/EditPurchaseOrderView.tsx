"use client";

import { QueryBoundary } from "@/components/common/QueryBoundary";
import { Unauthorized } from "@/components/common/Unauthorized";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useGetPurchaseOrderQuery } from "@/services/api/endpoints/purchaseOrdersApi";
import { PurchaseOrderForm } from "./PurchaseOrderForm";

export function EditPurchaseOrderView({ id }: { id: string }) {
  const query = useGetPurchaseOrderQuery(id);
  useBreadcrumbLabel(id, query.data?.poNumber);
  return (
    <QueryBoundary {...query}>
      {(order) => (order.status === "draft" || order.status === "pending" ? <PurchaseOrderForm order={order} /> : <Unauthorized homeHref={`/purchase-orders/${order.id}`} />)}
    </QueryBoundary>
  );
}
