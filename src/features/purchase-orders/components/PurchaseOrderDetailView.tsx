"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, PackageCheck, Pencil, Printer, Send, ShoppingCart, Trash2, XCircle } from "lucide-react";
import { Can } from "@/components/common/Can";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DetailList } from "@/components/common/DetailList";
import { ProfileHeader } from "@/components/common/ProfileHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { PERMISSIONS } from "@/constants/permissions";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import {
  useDeletePurchaseOrderMutation,
  useGetPurchaseOrderQuery,
  useUpdatePurchaseOrderStatusMutation,
} from "@/services/api/endpoints/purchaseOrdersApi";
import type { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from "@/types/models";
import { ReceiveDialog } from "./ReceiveDialog";

function PurchaseOrderDetail({ order }: { order: PurchaseOrder }) {
  const router = useRouter();
  const toast = useToast();
  const [updateStatus, { isLoading: updating }] = useUpdatePurchaseOrderStatusMutation();
  const [deleteOrder, { isLoading: deleting }] = useDeletePurchaseOrderMutation();
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null);
  const [receiving, setReceiving] = useState(false);

  const change = async (status: PurchaseOrderStatus, message: string) => {
    try {
      await updateStatus({ id: order.id, status }).unwrap();
      toast.success(message, order.poNumber);
      setConfirm(null);
    } catch (error) {
      toast.error("Could not update purchase order", error);
    }
  };

  const received = order.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
  const ordered = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const columns: Column<PurchaseOrderItem>[] = [
    { key: "productName", header: "Product", cell: (row) => (
      <Link href={`/products/${row.productId}`} className="hover:underline">
        <span className="block font-medium">{row.productName}</span>
        <span className="font-mono text-xs text-muted">{row.sku}</span>
      </Link>
    ) },
    { key: "quantity", header: "Ordered", align: "right", cell: (row) => `${row.quantity} ${row.unit}` },
    { key: "receivedQuantity", header: "Received", align: "right", cell: (row) => (
      <span className={row.receivedQuantity >= row.quantity ? "font-semibold text-emerald-700" : row.receivedQuantity ? "font-semibold text-amber-700" : "text-muted"}>{row.receivedQuantity}</span>
    ) },
    { key: "unitCost", header: "Unit cost", align: "right", cell: (row) => formatCurrency(row.unitCost) },
    { key: "amount", header: "Amount", align: "right", cell: (row) => <span className="font-semibold">{formatCurrency(row.quantity * row.unitCost)}</span> },
  ];

  return (
    <>
      <ProfileHeader
        name={order.poNumber}
        icon={<span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-900"><ShoppingCart className="h-7 w-7" /></span>}
        subtitle={`${order.supplierName} → ${order.warehouseName}`}
        badges={<StatusBadge status={order.status} />}
        meta={[
          { label: "Order total", value: formatCurrency(order.total ?? 0) },
          { label: "Ordered", value: formatDate(order.orderDate) },
          { label: "Expected", value: formatDate(order.expectedDate) },
          { label: "Received", value: `${received} of ${ordered} units` },
        ]}
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()} leftIcon={<Printer className="h-4 w-4" />}>Print</Button>
            {(order.status === "draft" || order.status === "pending") && (
              <Can permission={PERMISSIONS.purchasingManage}>
                <ButtonLink href={`/purchase-orders/${order.id}/edit`} variant="outline" leftIcon={<Pencil className="h-4 w-4" />}>Edit</ButtonLink>
              </Can>
            )}
            {order.status === "draft" && (
              <Can permission={PERMISSIONS.purchasingManage}>
                <Button onClick={() => change("pending", "Submitted for approval")} loading={updating} leftIcon={<Send className="h-4 w-4" />}>Submit</Button>
                <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirm("delete")} aria-label="Delete draft"><Trash2 className="h-4 w-4" /></Button>
              </Can>
            )}
            {order.status === "pending" && (
              <Can permission={PERMISSIONS.purchasingApprove}>
                <Button onClick={() => change("approved", "Purchase order approved")} loading={updating} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Approve</Button>
              </Can>
            )}
            {(order.status === "approved" || order.status === "partially-received") && (
              <Can permission={PERMISSIONS.inventoryAdjust}>
                <Button onClick={() => setReceiving(true)} leftIcon={<PackageCheck className="h-4 w-4" />}>Receive delivery</Button>
              </Can>
            )}
            {["draft", "pending", "approved"].includes(order.status) && (
              <Can permission={PERMISSIONS.purchasingApprove}>
                <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirm("cancel")} leftIcon={<XCircle className="h-4 w-4" />}>Cancel PO</Button>
              </Can>
            )}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Items" description={`${order.itemCount} line item(s)`} />
          <DataTable caption="Purchase order items" columns={columns} rows={order.items} rowKey={(row) => row.productId} />
          <div className="flex justify-end border-t border-line px-5 py-3 text-sm">
            Total <span className="ml-3 text-base font-bold">{formatCurrency(order.total ?? 0)}</span>
          </div>
        </Card>
        <Card>
          <CardHeader title="Details" />
          <CardContent>
            <DetailList
              columns={2}
              items={[
                { label: "Supplier", value: <Link className="text-brand-700 hover:underline" href={`/suppliers/${order.supplierId}`}>{order.supplierName}</Link> },
                { label: "Deliver to", value: <Link className="text-brand-700 hover:underline" href={`/warehouses/${order.warehouseId}`}>{order.warehouseName}</Link> },
                { label: "Created by", value: order.createdBy },
                { label: "Approved by", value: order.approvedBy },
                { label: "Created", value: formatDateTime(order.createdAt) },
                { label: "Last updated", value: formatDateTime(order.updatedAt) },
                { label: "Notes", value: order.notes, wide: true },
              ]}
            />
          </CardContent>
        </Card>
      </div>
      {receiving && <ReceiveDialog order={order} open={receiving} onClose={() => setReceiving(false)} />}
      <ConfirmDialog
        open={confirm === "cancel"}
        title="Cancel purchase order?"
        description={`${order.poNumber} will be cancelled and can no longer be received.`}
        confirmLabel="Cancel purchase order"
        loading={updating}
        onConfirm={() => change("cancelled", "Purchase order cancelled")}
        onClose={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title="Delete draft?"
        description={`Permanently delete draft ${order.poNumber}?`}
        confirmLabel="Delete draft"
        loading={deleting}
        onConfirm={async () => {
          try {
            await deleteOrder(order.id).unwrap();
            toast.success("Draft deleted", order.poNumber);
            router.replace("/purchase-orders");
          } catch (error) {
            toast.error("Could not delete draft", error);
            setConfirm(null);
          }
        }}
        onClose={() => setConfirm(null)}
      />
    </>
  );
}

export function PurchaseOrderDetailView({ id }: { id: string }) {
  const query = useGetPurchaseOrderQuery(id);
  useBreadcrumbLabel(id, query.data?.poNumber);
  return <QueryBoundary {...query}>{(order) => <PurchaseOrderDetail order={order} />}</QueryBoundary>;
}
