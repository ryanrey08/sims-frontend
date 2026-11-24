"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Power, ShoppingCart, Truck } from "lucide-react";
import { Can } from "@/components/common/Can";
import { DetailList } from "@/components/common/DetailList";
import { ProfileHeader } from "@/components/common/ProfileHeader";
import { QueryBoundary } from "@/components/common/QueryBoundary";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/States";
import { DataTable, type Column } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { PERMISSIONS } from "@/constants/permissions";
import { useBreadcrumbLabel } from "@/hooks/useBreadcrumbLabel";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  useGetSupplierProductsQuery,
  useGetSupplierPurchaseOrdersQuery,
  useGetSupplierQuery,
  useUpdateSupplierStatusMutation,
} from "@/services/api/endpoints/suppliersApi";
import type { PurchaseOrder, Supplier } from "@/types/models";

function SupplierDetail({ supplier }: { supplier: Supplier }) {
  const router = useRouter();
  const toast = useToast();
  const orders = useGetSupplierPurchaseOrdersQuery(supplier.id);
  const { data: products } = useGetSupplierProductsQuery(supplier.id);
  const [updateStatus, { isLoading }] = useUpdateSupplierStatusMutation();

  const toggle = async () => {
    const status = supplier.status === "active" ? "inactive" : "active";
    try {
      await updateStatus({ id: supplier.id, status }).unwrap();
      toast.success(status === "active" ? "Supplier activated" : "Supplier deactivated", supplier.name);
    } catch (error) {
      toast.error("Could not update supplier", error);
    }
  };

  const columns: Column<PurchaseOrder>[] = [
    { key: "poNumber", header: "PO number", cell: (row) => <span className="font-mono text-xs font-semibold">{row.poNumber}</span> },
    { key: "orderDate", header: "Ordered", cell: (row) => formatDate(row.orderDate) },
    { key: "itemCount", header: "Items", align: "center", cell: (row) => row.itemCount },
    { key: "total", header: "Total", align: "right", cell: (row) => formatCurrency(row.total ?? 0) },
    { key: "status", header: "Status", cell: (row) => <StatusBadge status={row.status} /> },
  ];

  return (
    <>
      <ProfileHeader
        name={supplier.name}
        icon={<span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-900"><Truck className="h-7 w-7" /></span>}
        subtitle={`${supplier.code} · ${supplier.contactPerson}`}
        badges={<StatusBadge status={supplier.status} />}
        meta={[
          { label: "Payment terms", value: supplier.paymentTerms },
          { label: "Lead time", value: `${supplier.leadTimeDays} days` },
          { label: "Purchase orders", value: supplier.orderCount ?? 0 },
          { label: "Total purchased", value: formatCurrency(supplier.totalPurchased ?? 0) },
        ]}
        actions={
          <>
            <Can permission={PERMISSIONS.purchasingManage}>
              <ButtonLink href={`/purchase-orders/new?supplierId=${supplier.id}`} variant="outline" leftIcon={<ShoppingCart className="h-4 w-4" />}>
                New PO
              </ButtonLink>
            </Can>
            <Can permission={PERMISSIONS.suppliersManage}>
              <Button variant="outline" onClick={toggle} loading={isLoading} leftIcon={<Power className="h-4 w-4" />}>
                {supplier.status === "active" ? "Deactivate" : "Activate"}
              </Button>
              <ButtonLink href={`/suppliers/${supplier.id}/edit`} variant="secondary" leftIcon={<Pencil className="h-4 w-4" />}>Edit</ButtonLink>
            </Can>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Contact details" />
          <CardContent>
            <DetailList
              columns={2}
              items={[
                { label: "Email", value: <a className="text-brand-700 hover:underline" href={`mailto:${supplier.email}`}>{supplier.email}</a> },
                { label: "Phone", value: supplier.phone },
                { label: "TIN", value: supplier.tin },
                { label: "Since", value: formatDate(supplier.createdAt) },
                { label: "Address", value: supplier.address, wide: true },
              ]}
            />
          </CardContent>
          <CardHeader title="Supplied products" className="border-t" />
          {products?.length ? (
            <ul className="divide-y divide-line">
              {products.map((product) => (
                <li key={product.id}>
                  <Link href={`/products/${product.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-slate-50">
                    <span className="truncate text-sm">{product.name}</span>
                    <StatusBadge status={product.stockStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No products linked" description="Set this supplier as a product's preferred supplier." />
          )}
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader title="Purchase order history" />
          <DataTable
            caption="Purchase orders"
            columns={columns}
            rows={orders.data}
            rowKey={(row) => row.id}
            loading={orders.isLoading}
            error={orders.error}
            onRetry={orders.refetch}
            onRowClick={(row) => router.push(`/purchase-orders/${row.id}`)}
            empty={<EmptyState title="No purchase orders yet" />}
          />
        </Card>
      </div>
    </>
  );
}

export function SupplierDetailView({ id }: { id: string }) {
  const query = useGetSupplierQuery(id);
  useBreadcrumbLabel(id, query.data?.name);
  return <QueryBoundary {...query}>{(supplier) => <SupplierDetail supplier={supplier} />}</QueryBoundary>;
}
